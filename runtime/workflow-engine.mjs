import { randomUUID } from 'node:crypto'
import { findAgent } from './loaders.mjs'
import { createRunState, CliSessionStore, recordEvent } from './state-store.mjs'
import { RunTelemetry } from './telemetry.mjs'
import { CapabilityGateway } from './capability-gateway.mjs'
import { DispatchManager } from './dispatch-manager.mjs'
import { ApprovalManager } from './approval-manager.mjs'
import { extractJsonObject, validateContractOutput } from './contract-validator.mjs'

const defaultRepository = (request, agent) =>
  request.repositories?.find((repository) => agent.repositories?.includes(repository)) ??
  agent.repositories?.[0] ??
  'nino-app'

function statusOf(output) {
  return extractJsonObject(output)?.status ?? 'DONE'
}

function stageDependenciesComplete(stage, state) {
  return (stage.dependsOn ?? []).every((dependency) => state.stages[dependency]?.status === 'DONE')
}

function chooseSkill(stage, agent) {
  const byStage = {
    'product-intake': 'business-discovery',
    'brief': 'technical-planning',
    'surface-discovery': 'browser-validation',
    'ux-design': 'ux-ui-design',
    'backend': 'nestjs',
    'frontend': 'react',
    'ux-review': 'ux-ui-review',
    'qa': 'browser-validation',
    'business-regression': 'business-regression',
  }
  return byStage[stage.id] && agent.skills.includes(byStage[stage.id]) ? byStage[stage.id] : agent.skills[0]
}

function stagePrompt({ stage, request, state, dispatch, adapter }) {
  const context = Object.entries(state.outputs)
    .map(([stageId, output]) => `\n## ${stageId}\n${output}`)
    .join('\n')
  return [
    `Run workflow stage: ${stage.id}.`,
    `User request: ${JSON.stringify(request)}`,
    dispatch ? `Dispatch contract: ${JSON.stringify(dispatch)}` : 'No specialist dispatch is required for this stage.',
    'Return the required output in valid JSON when a contract is available. Do not claim evidence you did not obtain.',
    adapter ? `Repository adapter:\n${adapter}` : '',
    context ? `Previous stage outputs:${context}` : '',
  ].filter(Boolean).join('\n\n')
}

function correctionStages(routingOutput) {
  const nextAgents = routingOutput?.nextAgents ?? []
  const targets = []
  if (nextAgents.includes('backend-dev')) targets.push('backend')
  if (nextAgents.includes('frontend-dev')) targets.push('frontend', 'ux-review')
  if (targets.length === 0) targets.push('backend', 'frontend', 'ux-review')
  return [...new Set([...targets, 'security', 'testing', 'qa', 'qa-routing'])]
}

export class WorkflowEngine {
  constructor({ configuration, stateStore, agentRunner, tools = new Map(), request, state, approvedPoints = [], signal, maxRetries = 2, timeoutMs = 300000 }) {
    this.configuration = configuration
    this.stateStore = stateStore
    this.agentRunner = agentRunner
    this.request = request
    this.state = state ?? createRunState({ runId: `run-${randomUUID()}`, request })
    this.telemetry = new RunTelemetry(this.state, stateStore)
    this.capabilityGateway = new CapabilityGateway({ configuration, state: this.state, telemetry: this.telemetry, tools })
    this.dispatchManager = new DispatchManager({ state: this.state, stateStore, telemetry: this.telemetry })
    this.approvalManager = new ApprovalManager({ state: this.state, stateStore, approvedPoints })
    this.signal = signal
    this.maxRetries = maxRetries
    this.timeoutMs = timeoutMs
  }

  async plan() {
    return {
      runId: this.state.runId,
      workflow: this.configuration.workflow.id,
      stages: this.configuration.workflow.stages.map((stage) => ({
        id: stage.id,
        agent: stage.agent,
        dependsOn: stage.dependsOn ?? [],
        dispatch: stage.dispatch ?? 'not-required',
        parallelGroup: stage.parallelGroup ?? null,
      })),
    }
  }

  async execute() {
    if (this.signal?.aborted) throw this.signal.reason ?? new Error('Workflow execution cancelled')
    this.state.status = 'RUNNING'
    await this.stateStore.save(this.state)
    const stages = this.configuration.workflow.stages
    const pending = new Set(stages.filter((stage) => this.state.stages[stage.id]?.status !== 'DONE').map((stage) => stage.id))

    try {
      while (pending.size > 0) {
        const ready = stages.filter((stage) => pending.has(stage.id) && stageDependenciesComplete(stage, this.state))
        if (ready.length === 0) throw new Error(`Workflow is blocked; pending stages: ${[...pending].join(', ')}`)

        const groups = []
        for (const stage of ready) {
          const key = stage.parallelGroup ? `parallel:${stage.parallelGroup}` : `serial:${stage.id}`
          let group = groups.find((candidate) => candidate.key === key)
          if (!group) {
            group = { key, stages: [] }
            groups.push(group)
          }
          group.stages.push(stage)
        }

        const group = groups[0]
        const results = await Promise.all(group.stages.map((stage) => this.executeStage(stage)))
        group.stages.forEach((stage) => pending.delete(stage.id))
        for (const result of results) for (const stageId of result?.requeue ?? []) pending.add(stageId)
      }
      this.state.status = 'DONE'
      await this.telemetry.event({ type: 'run-completed', status: 'DONE' })
      return this.state
    } catch (error) {
      if (this.state.status !== 'WAITING_APPROVAL') this.state.status = 'BLOCKED'
      recordEvent(this.state, { type: 'run-blocked', error: error.message })
      await this.stateStore.save(this.state)
      throw Object.assign(error, { runState: this.state })
    }
  }

  async executeStage(stage) {
    const agent = findAgent(this.configuration, stage.agent)
    this.state.currentStage = stage.id
    this.state.stages[stage.id] = { status: 'IN-PROGRESS', agent: agent.id, startedAt: new Date().toISOString() }
    await this.telemetry.event({ type: 'stage-started', stage: stage.id, agent: agent.id })

    if (stage.approval) {
      try {
        await this.approvalManager.require(stage.approval, stage.id)
      } catch (error) {
        this.state.status = 'WAITING_APPROVAL'
        this.state.stages[stage.id] = { status: 'WAITING_APPROVAL', agent: agent.id, approval: stage.approval }
        await this.stateStore.save(this.state)
        throw error
      }
    }

    if (stage.id === 'orchestration-preflight') {
      if (!this.state.businessBrief || this.state.businessBrief.status !== 'APPROVED') {
        throw new Error('Business brief must be APPROVED before technical work')
      }
      this.state.stages[stage.id] = { status: 'DONE', agent: agent.id, output: 'Preflight passed' }
      await this.telemetry.event({ type: 'stage-completed', stage: stage.id, status: 'DONE' })
      return { requeue: [] }
    }

    let dispatch = null
    const repository = defaultRepository(this.request, agent)
    if (stage.dispatch === 'required' && agent.id !== 'tech-lead') {
      dispatch = await this.dispatchManager.issue({
        stage: stage.id,
        task: `${this.state.runId}:${stage.id}`,
        targetAgent: agent.id,
        scope: [repository],
        dependsOn: stage.dependsOn ?? [],
        acceptanceCriteria: [stage.output ?? `Complete ${stage.id}`],
        requiredOutput: stage.output ?? `${stage.id}-handoff`,
      })
      this.state.dispatch = dispatch
      await this.dispatchManager.update(dispatch, 'IN-PROGRESS')
    } else if (stage.id === 'product-intake') {
      this.state.techLeadInvocation = {
        id: `invocation-${this.state.runId}`,
        invokedBy: 'product-owner',
        targetAgent: 'tech-lead',
        status: 'READY',
      }
    }

    const skill = chooseSkill(stage, agent)
    const isProductOwner = agent.id === 'product-owner'
    const isTechLead = agent.id === 'tech-lead'
    this.capabilityGateway.authorize({
      agentId: agent.id,
      action: isProductOwner ? 'browser-checks' : 'inspect',
      skill,
      repository,
      actor: isProductOwner ? 'product-owner' : isTechLead ? 'tech-lead' : 'specialist',
      preflightAction: isProductOwner ? undefined : isTechLead ? 'technical-inspection' : 'specialist-technical-inspection',
    })

    const result = await this.agentRunner({
      agent,
      profile: this.configuration.profiles.get(agent.id),
      prompt: stagePrompt({ stage, request: this.request, state: this.state, dispatch, adapter: this.configuration.adapters.get(repository) }),
      adapter: this.configuration.adapters.get(repository),
      repository,
      stageId: stage.id,
      signal: this.signal,
      maxRetries: stage.retry?.maxRetries ?? this.maxRetries,
      timeoutMs: stage.timeoutMs ?? this.timeoutMs,
      session: new CliSessionStore({ state: this.state, stateStore: this.stateStore, sessionId: `${this.state.runId}:${agent.id}` }),
      tools: this.capabilityGateway.definitionsFor(agent.id).map((definition) => ({
        ...definition,
        execute: (input) => this.capabilityGateway.executeTool(definition.name, input, { agentId: agent.id }),
      })),
      telemetry: this.telemetry,
    })
    const contract = this.configuration.contracts.get(stage.output)
    const validatedOutput = validateContractOutput(result.output, contract, stage.output)
    if (!validatedOutput.valid) throw new Error(`${stage.id} output rejected: ${validatedOutput.errors.join('; ')}`)
    this.state.outputs[stage.id] = result.output
    const outputStatus = statusOf(result.output)
    const stageStatus = ['BLOCKED', 'NEEDS-DECISION', 'NEEDS-EVIDENCE', 'FAIL'].includes(outputStatus) ? outputStatus : 'DONE'
    this.state.stages[stage.id] = {
      status: stageStatus,
      agent: agent.id,
      dispatchId: dispatch?.id ?? null,
      output: result.output,
      usage: result.usage ?? null,
      completedAt: new Date().toISOString(),
    }
    if (stage.id === 'product-intake') this.state.businessBrief = extractJsonObject(result.output)
    if (dispatch) await this.dispatchManager.update(dispatch, stageStatus === 'DONE' ? 'DONE' : 'BLOCKED')
    await this.telemetry.event({ type: 'stage-completed', stage: stage.id, status: this.state.stages[stage.id].status })
    if (stage.id !== 'qa-routing') return { requeue: [] }

    const routingOutput = validatedOutput.value
    if (routingOutput.decision !== 'ROUTE-CORRECTION') return { requeue: [] }
    const iteration = routingOutput.iteration ?? 1
    const maxIterations = stage.loop?.maxIterations ?? 3
    if (iteration >= maxIterations) throw new Error(`QA correction loop exhausted after ${maxIterations} iterations`)
    await this.telemetry.event({ type: 'qa-correction-routed', iteration, nextAgents: routingOutput.nextAgents ?? [] })
    return { requeue: correctionStages(routingOutput) }
  }
}
