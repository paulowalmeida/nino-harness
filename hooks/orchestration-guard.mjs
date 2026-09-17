import { parseRegistryAgents, printResult, readText } from './utils.mjs'

const errors = []
const requiredAgents = [
  'product-owner',
  'tech-lead',
  'qa',
  'frontend-dev',
  'backend-dev',
  'testing',
  'security',
  'release',
]
const delegatedStages = [
  'architecture',
  'contract',
  'environment-readiness',
  'surface-discovery',
  'backend',
  'frontend',
  'ux-review',
  'security',
  'testing',
  'qa',
  'retrospective',
  'learning-review',
  'business-regression',
  'operations-review',
  'documentation',
  'release',
]

function stageBlock(workflow, stageId) {
  const lines = workflow.split('\n')
  const start = lines.findIndex((line) => line === `  - id: ${stageId}`)
  if (start < 0) return undefined
  const nextStage = lines.findIndex((line, index) => index > start && /^  - id: /.test(line))
  return lines.slice(start, nextStage < 0 ? lines.length : nextStage).join('\n')
}

function stageAgent(workflow, stageId) {
  const block = stageBlock(workflow, stageId)
  return block?.match(/^    agent: (.+)$/m)?.[1].trim()
}

try {
  const agents = parseRegistryAgents(await readText('agents/registry.yaml'))
  const byId = new Map(agents.map((agent) => [agent.id, agent]))

  for (const id of requiredAgents) {
    const agent = byId.get(id)
    if (!agent) errors.push(`required orchestration agent is missing: ${id}`)
    else if (agent.status !== 'active') errors.push(`${id} must be active for delegated execution`)
  }

  const techLead = byId.get('tech-lead')
  if (!techLead?.permissions?.includes('delegate')) errors.push('tech-lead must have delegate permission')
  if (!techLead?.forbidden?.includes('edit-source')) errors.push('tech-lead must forbid edit-source')

  const workflow = await readText('workflows/feature-delivery.yaml')
  for (const requirement of [
    /^orchestration:\s*$/m,
    /^  dispatcher:\s*tech-lead\s*$/m,
    /^  executionMode:\s*delegated-only\s*$/m,
    /^  requiredDispatchContract:\s*contracts\/agent-dispatch\.schema\.json\s*$/m,
    /^  onDispatcherUnavailable:\s*BLOCKED\s*$/m,
    /^  implementationAuthority:\s*specialist-dispatch-only\s*$/m,
  ]) {
    if (!requirement.test(workflow)) errors.push(`feature-delivery.yaml is missing orchestration rule: ${requirement}`)
  }

  if (workflow.indexOf('id: product-intake') > workflow.indexOf('id: brief')) {
    errors.push('product-owner intake must precede the tech-lead brief')
  }

  for (const stageId of delegatedStages) {
    const agent = stageAgent(workflow, stageId)
    if (!agent) {
      errors.push(`workflow stage is missing an agent: ${stageId}`)
      continue
    }
    if (agent === 'tech-lead') errors.push(`specialist stage cannot be owned by tech-lead: ${stageId}`)
    if (!/^    dispatch: required *$/m.test(stageBlock(workflow, stageId) ?? '')) {
      errors.push(`workflow stage requires an agent dispatch: ${stageId}`)
    }
  }

  const qaPosition = workflow.indexOf('id: qa')
  const routingPosition = workflow.indexOf('id: qa-routing')
  const regressionPosition = workflow.indexOf('id: business-regression')
  const releasePosition = workflow.indexOf('id: release')
  if (!(qaPosition < routingPosition && routingPosition < regressionPosition && regressionPosition < releasePosition)) {
    errors.push('workflow must route QA findings before business regression and release')
  }

  const dispatchSchema = JSON.parse(await readText('contracts/agent-dispatch.schema.json'))
  if (dispatchSchema.properties?.sourceAgent?.const !== 'tech-lead') {
    errors.push('agent-dispatch schema must restrict sourceAgent to tech-lead')
  }
  if (dispatchSchema.properties?.targetAgent?.not?.const !== 'tech-lead') {
    errors.push('agent-dispatch schema must reject tech-lead as targetAgent')
  }
} catch (error) {
  errors.push(`orchestration policy could not be inspected: ${error.message}`)
}

const passed = printResult('orchestration-guard', errors)
if (!passed) process.exitCode = 1
