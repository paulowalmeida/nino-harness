import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findPortugueseLines } from '../hooks/language-guard.mjs'
import { harnessRoot, parseRegistryAgents } from '../hooks/utils.mjs'

async function readArtifact(relativePath) {
  return readFile(join(harnessRoot, relativePath), 'utf8')
}

function containsPattern(text, pattern, regex = false) {
  return regex ? new RegExp(pattern, 'm').test(text) : text.includes(pattern)
}

export async function evaluateAssertion(assertion) {
  switch (assertion.type) {
    case 'file_contains': {
      const text = await readArtifact(assertion.path)
      const pass = containsPattern(text, assertion.pattern, assertion.regex)
      return { pass, evidence: `${assertion.path} contains expected pattern: ${assertion.pattern}` }
    }
    case 'file_not_contains': {
      const text = await readArtifact(assertion.path)
      const pass = !containsPattern(text, assertion.pattern, assertion.regex)
      return { pass, evidence: `${assertion.path} does not contain forbidden pattern: ${assertion.pattern}` }
    }
    case 'json_required_fields': {
      const document = JSON.parse(await readArtifact(assertion.path))
      const required = new Set(document.required ?? [])
      const missing = assertion.fields.filter((field) => !required.has(field))
      return { pass: missing.length === 0, evidence: `${assertion.path} required fields: ${assertion.fields.join(', ')}`, details: { missing } }
    }
    case 'workflow_stage_order': {
      const workflow = await readArtifact(assertion.path ?? 'workflows/feature-delivery.yaml')
      const positions = assertion.stages.map((stage) => workflow.indexOf(`id: ${stage}`))
      const pass = positions.every((position) => position >= 0) && positions.every((position, index) => index === 0 || position > positions[index - 1])
      return { pass, evidence: `workflow stages are ordered: ${assertion.stages.join(' -> ')}`, details: { positions } }
    }
    case 'registry_agent': {
      const registry = parseRegistryAgents(await readArtifact('agents/registry.yaml'))
      const agent = registry.find((candidate) => candidate.id === assertion.id)
      const pass = Boolean(agent) && Object.entries(assertion.fields ?? {}).every(([key, value]) => agent[key] === value)
      return { pass, evidence: `registry agent ${assertion.id} has the expected role and status`, details: { agent } }
    }
    case 'language_violation_count': {
      const violations = findPortugueseLines(assertion.text)
      const pass = violations.length === assertion.expectedCount
      return { pass, evidence: `language guard found ${violations.length} violation(s), expected ${assertion.expectedCount}`, details: { violations } }
    }
    default:
      return { pass: false, evidence: `unknown assertion type: ${assertion.type}` }
  }
}
