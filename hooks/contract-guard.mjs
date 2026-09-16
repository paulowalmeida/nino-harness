import { readText, printResult } from './utils.mjs'

const errors = []
let schema

try {
  schema = JSON.parse(await readText('contracts/work-order.schema.json'))
} catch {
  errors.push('contracts/work-order.schema.json is not valid JSON')
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

try {
  const workflow = await readText('workflows/feature-delivery.yaml')
  if (!/^version:\s*1\s*$/m.test(workflow)) errors.push('feature-delivery.yaml must declare version: 1')
  if (!/^stages:\s*$/m.test(workflow)) errors.push('feature-delivery.yaml is missing stages')
} catch {
  errors.push('workflows/feature-delivery.yaml is missing')
}

const passed = printResult('contract-guard', errors)
if (!passed) process.exitCode = 1
