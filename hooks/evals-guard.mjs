import { readFile } from 'node:fs/promises'
import { printResult, harnessRoot } from './utils.mjs'

const errors = []
const allowedClasses = new Set(['happy-path', 'explicit-violation', 'adversarial'])
const allowedAssertions = new Set(['file_contains', 'file_not_contains', 'json_required_fields', 'workflow_stage_order', 'registry_agent', 'language_violation_count'])

try {
  const scenarios = JSON.parse(await readFile(`${harnessRoot}/evals/scenarios/catalog.json`, 'utf8'))
  if (!Array.isArray(scenarios) || scenarios.length < 12) errors.push('scenario catalog must contain at least 12 scenarios')
  const ids = new Set()
  for (const scenario of scenarios) {
    if (!/^[A-Z]+-[0-9]{3}$/.test(scenario.id ?? '') || ids.has(scenario.id)) errors.push(`invalid or duplicate scenario id: ${scenario.id}`)
    ids.add(scenario.id)
    if (!scenario.title || !scenario.category || !allowedClasses.has(scenario.class)) errors.push(`${scenario.id}: missing scenario metadata`)
    if (!Array.isArray(scenario.assertions) || scenario.assertions.length === 0) errors.push(`${scenario.id}: assertions must be non-empty`)
    for (const assertion of scenario.assertions ?? []) {
      if (!allowedAssertions.has(assertion.type)) errors.push(`${scenario.id}: unsupported assertion type: ${assertion.type}`)
    }
  }
} catch {
  errors.push('evals/scenarios/catalog.json is not valid JSON')
}

const passed = printResult('evals-guard', errors)
if (!passed) process.exitCode = 1
