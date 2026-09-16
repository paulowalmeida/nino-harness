import { readText, printResult } from './utils.mjs'

const errors = []
let schema

const requiredSchemas = {
  'contracts/work-order.schema.json': [
    'objective',
    'repositories',
    'scope',
    'outOfScope',
    'verifiedEvidence',
    'decisionsRequired',
    'delegationGraph',
    'requiredGates',
    'status',
  ],
  'contracts/feedback-record.schema.json': [
    'id',
    'runId',
    'createdAt',
    'source',
    'classification',
    'observation',
    'evidence',
    'feedForward',
    'decision',
    'status',
  ],
  'contracts/business-brief.schema.json': [
    'id',
    'taskId',
    'objective',
    'users',
    'priority',
    'scope',
    'outOfScope',
    'acceptanceCriteria',
    'criticalJourneys',
    'decisionsRequired',
    'status',
  ],
  'contracts/business-regression.schema.json': [
    'id',
    'taskId',
    'runId',
    'criteria',
    'journeys',
    'status',
  ],
  'contracts/routing-decision.schema.json': [
    'id',
    'taskId',
    'sourceQaHandoff',
    'findings',
    'iteration',
    'decision',
    'status',
  ],
  'contracts/security-review.schema.json': [
    'id',
    'taskId',
    'scope',
    'findings',
    'status',
  ],
  'contracts/environment-plan.schema.json': [
    'id',
    'taskId',
    'environments',
    'targets',
    'checks',
    'status',
  ],
  'contracts/operations-review.schema.json': [
    'id',
    'taskId',
    'runId',
    'checks',
    'rollbackReady',
    'status',
  ],
}

try {
  schema = JSON.parse(await readText('contracts/work-order.schema.json'))
} catch {
  errors.push('contracts/work-order.schema.json is not valid JSON')
}

for (const [path, fields] of Object.entries(requiredSchemas)) {
  if (path === 'contracts/work-order.schema.json' || path === 'contracts/feedback-record.schema.json') continue
  try {
    const candidate = JSON.parse(await readText(path))
    for (const field of fields) {
      if (!candidate.required?.includes(field)) errors.push(`${path} missing required field: ${field}`)
    }
    if (candidate.additionalProperties !== false) errors.push(`${path} must reject additional properties`)
  } catch {
    errors.push(`${path} is not valid JSON`)
  }
}

if (schema) {
  const required = new Set(schema.required ?? [])
  for (const field of [
    'objective',
    'repositories',
    'scope',
    'outOfScope',
    'verifiedEvidence',
    'decisionsRequired',
    'delegationGraph',
    'requiredGates',
    'status',
  ]) {
    if (!required.has(field)) errors.push(`work-order schema missing required field: ${field}`)
  }

  if (schema.additionalProperties !== false) {
    errors.push('work-order schema must reject additional properties')
  }

  const allowedStatuses = schema.properties?.status?.enum ?? []
  if (allowedStatuses.length !== 4) errors.push('work-order schema must define all four work-order statuses')
}

let feedbackSchema
try {
  feedbackSchema = JSON.parse(await readText('contracts/feedback-record.schema.json'))
} catch {
  errors.push('contracts/feedback-record.schema.json is not valid JSON')
}

if (feedbackSchema) {
  for (const field of ['id', 'runId', 'createdAt', 'source', 'classification', 'observation', 'evidence', 'feedForward', 'decision', 'status']) {
    if (!feedbackSchema.required?.includes(field)) errors.push(`feedback schema missing required field: ${field}`)
  }
  if (feedbackSchema.additionalProperties !== false) errors.push('feedback schema must reject additional properties')
}

try {
  const workflow = await readText('workflows/feature-delivery.yaml')
  if (!/^version:\s*1\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must declare version: 1')
  if (!/^stages:\s*$/m.test(workflow)) errors.push('feature-delivery.yaml is missing stages')
  if (!/^      maxIterations:\s*3\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must cap the QA loop at three iterations')
  if (!/^      onExhausted:\s*BLOCKED\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must block an exhausted QA loop')
  if (!/^  - id: environment-readiness\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must include environment readiness')
  if (!/^  - id: operations-review\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must include operations review')
  if (!/^  - id: business-regression\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must include business regression')
} catch {
  errors.push('workflows/feature-delivery.yaml is missing')
}

const passed = printResult('contract-guard', errors)
if (!passed) process.exitCode = 1
