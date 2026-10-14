import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadHarnessConfiguration } from '../loaders.mjs'
import { createScriptedAgentRunner } from '../agent-runner.mjs'
import { CliSessionStore, JsonStateStore, createRunState } from '../state-store.mjs'
import { WorkflowEngine } from '../workflow-engine.mjs'
import { ApprovalRequiredError } from '../approval-manager.mjs'

const brief = {
  id: 'brief-1',
  taskId: 'task-1',
  objective: 'Validate the executable harness workflow',
  users: ['operator'],
  priority: 'medium',
  scope: ['nino-app'],
  outOfScope: [],
  acceptanceCriteria: [{ id: 'AC-1', description: 'Workflow completes', verification: 'Runtime state is DONE' }],
  criticalJourneys: [{ id: 'J-1', description: 'Complete the workflow' }],
  decisionsRequired: [],
  status: 'APPROVED',
}

const workOrder = {
  objective: 'Execute the harness workflow',
  repositories: ['nino-app'],
  scope: ['nino-app'],
  outOfScope: [],
  verifiedEvidence: ['Business brief approved'],
  decisionsRequired: [],
  delegationGraph: [{
    order: 1,
    sourceAgent: 'tech-lead',
    agent: 'architecture',
    task: 'Review boundaries',
    dependsOn: [],
    dispatchId: 'dispatch-architecture',
    acceptanceCriteria: ['Return an architecture decision'],
    requiredOutput: 'architecture-decision',
  }],
  requiredGates: ['harness:guard'],
  status: 'READY-FOR-EXECUTION',
}

const uxDesign = {
  id: 'ux-design-1',
  taskId: 'task-1',
  scope: ['nino-app'],
  surfaces: [{ id: 'surface-1', route: '/test', userGoal: 'Complete the test flow', primaryAction: 'Continue' }],
  experience: {
    journeys: ['Open the surface and continue'],
    informationHierarchy: ['Primary action'],
    states: [{ state: 'ready', behavior: 'Show the primary action' }],
  },
  visualDirection: {
    rationale: 'Preserve the current Nino visual language',
    hierarchy: 'Primary action first',
    typography: 'Use Design System typography',
    color: 'Use semantic Design System tokens',
    motion: 'No non-essential motion',
    signatureElement: 'Nino action treatment',
  },
  responsive: {
    strategy: 'Mobile first',
    breakpoints: ['Use project breakpoints'],
    touchAndOverflow: 'Keep the action reachable without horizontal overflow',
  },
  accessibility: {
    target: 'WCAG-2.2-AA',
    semantics: 'Use native semantics',
    keyboard: 'Preserve logical keyboard order',
    focus: 'Keep visible focus',
    announcements: 'Announce asynchronous failures',
    contrastAndTargets: 'Use compliant tokens and targets',
    motion: 'Respect reduced motion',
  },
  internationalization: {
    currentLocale: 'pt-BR',
    translation: 'Use complete translatable messages',
    textExpansion: 'Allow labels to expand',
    formatting: 'Use locale-aware formatting',
    pluralization: 'Keep plural forms explicit',
    directionality: 'Do not encode meaning only by direction',
  },
  designSystem: {
    candidates: [{ responsibility: 'Primary action', candidate: 'Button', inspected: true, decision: 'REUSE', reason: 'The component satisfies the action contract' }],
    localGaps: [],
  },
  implementationHandoff: {
    acceptanceCriteria: ['The primary action is visible and operable'],
    visualQA: ['Verify mobile and desktop behavior'],
    outOfScope: [],
  },
  openDecisions: [],
  status: 'READY-FOR-IMPLEMENTATION',
}

const uxReview = {
  id: 'ux-review-1',
  taskId: 'task-1',
  designId: uxDesign.id,
  scope: ['nino-app'],
  criteria: [{ criterion: 'Primary action is visible and operable', result: 'PASS', evidence: ['Scripted review'] }],
  findings: [],
  limitations: [],
  status: 'PASS',
}

test('workflow engine executes stages, dispatches specialists, and persists state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nino-harness-runtime-'))
  try {
    const configuration = await loadHarnessConfiguration()
    let qaRoutingCalls = 0
    const agentRunner = createScriptedAgentRunner({
      'product-owner': JSON.stringify(brief),
      'tech-lead': JSON.stringify({ status: 'DONE', objective: 'Execute the task' }),
      brief: JSON.stringify(workOrder),
      'qa-routing': () => qaRoutingCalls++ === 0
        ? JSON.stringify({ id: 'routing-1', taskId: 'task-1', sourceQaHandoff: 'qa-1', findings: [{ id: 'finding-1', severity: 'medium', probableOwner: 'frontend-dev', evidence: ['Visible defect'] }], iteration: 1, decision: 'ROUTE-CORRECTION', nextAgents: ['frontend-dev'], status: 'IN-PROGRESS' })
        : JSON.stringify({ id: 'routing-2', taskId: 'task-1', sourceQaHandoff: 'qa-2', findings: [], iteration: 2, decision: 'READY-FOR-BUSINESS-REGRESSION', status: 'READY-FOR-BUSINESS-REGRESSION' }),
      'environment-readiness': JSON.stringify({ id: 'environment-1', taskId: 'task-1', environments: ['test'], targets: ['nino-app'], checks: ['quality'], status: 'READY' }),
      security: JSON.stringify({ id: 'security-1', taskId: 'task-1', scope: ['nino-app'], findings: [], status: 'PASS' }),
      'business-regression': JSON.stringify({
        id: 'regression-1',
        taskId: 'task-1',
        runId: 'run-1',
        criteria: [{ id: 'AC-1', result: 'PASS', evidence: ['Runtime state is DONE'] }],
        journeys: [{ id: 'J-1', result: 'PASS', evidence: ['Workflow completed'] }],
        status: 'PASS',
      }),
      'operations-review': JSON.stringify({ id: 'operations-1', taskId: 'task-1', runId: 'run-1', checks: ['rollback'], rollbackReady: true, status: 'READY' }),
      'architecture': JSON.stringify({ status: 'DONE' }),
      'sre-platform': JSON.stringify({ status: 'DONE' }),
      'qa': JSON.stringify({ status: 'PASS', findings: [], evidence: ['QA stage completed'] }),
      'backend-dev': JSON.stringify({ status: 'DONE' }),
      'frontend-dev': JSON.stringify({ status: 'DONE' }),
      'ux-design': JSON.stringify(uxDesign),
      'ux-review': JSON.stringify(uxReview),
      'testing': JSON.stringify({ status: 'DONE' }),
      'learning-curator': JSON.stringify({ status: 'DONE' }),
      'documentation': JSON.stringify({ status: 'DONE' }),
      'release': JSON.stringify({ status: 'DONE' }),
    })
    const state = await new WorkflowEngine({
      configuration,
      stateStore: new JsonStateStore(directory),
      agentRunner,
      request: { repositories: ['nino-app'], scope: ['nino-app'] },
      approvedPoints: ['ownership-or-architecture', 'contract', 'feedback-promotion', 'business-acceptance', 'production-action'],
    }).execute()

    assert.equal(state.status, 'DONE')
    assert.ok(state.dispatches.length > 5)
    assert.ok(state.dispatches.every((dispatch) => dispatch.sourceAgent === 'tech-lead'))
    assert.equal(state.businessBrief.status, 'APPROVED')
    assert.ok(state.events.some((event) => event.type === 'stage-completed'))
    assert.ok(state.events.some((event) => event.type === 'qa-correction-routed'))
    await readFile(join(directory, `${state.runId}.json`), 'utf8')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('workflow engine pauses with a resumable approval state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nino-harness-approval-'))
  try {
    const configuration = await loadHarnessConfiguration()
    const agentRunner = createScriptedAgentRunner({
      'product-owner': JSON.stringify(brief),
      'tech-lead': JSON.stringify({ status: 'DONE', objective: 'Plan the task' }),
      brief: JSON.stringify(workOrder),
    })
    const engine = new WorkflowEngine({
      configuration,
      stateStore: new JsonStateStore(directory),
      agentRunner,
      request: { repositories: ['nino-app'], scope: ['nino-app'] },
    })

    await assert.rejects(() => engine.execute(), ApprovalRequiredError)
    assert.equal(engine.state.status, 'WAITING_APPROVAL')
    assert.equal(engine.state.approvals[0].point, 'ownership-or-architecture')
    assert.equal(engine.state.approvals[0].status, 'PENDING')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('agent sessions survive checkpoint reloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nino-harness-session-'))
  try {
    const store = new JsonStateStore(directory)
    const state = createRunState({ runId: 'run-session', request: {} })
    const session = new CliSessionStore({ state, stateStore: store, sessionId: 'run-session:qa' })
    await session.set('claude-session-uuid')
    const reloaded = await store.load('run-session')
    const resumed = new CliSessionStore({ state: reloaded, stateStore: store, sessionId: 'run-session:qa' })
    assert.equal(resumed.get(), 'claude-session-uuid')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
