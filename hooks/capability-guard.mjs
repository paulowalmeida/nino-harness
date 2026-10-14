import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseRegistryAgents, printResult, readText } from './utils.mjs'

const knownActions = new Set([
  'read',
  'inspect',
  'clarify',
  'define-acceptance',
  'invoke-tech-lead',
  'review',
  'run-checks',
  'plan',
  'delegate',
  'create-specialists',
  'configure',
  'propose',
  'edit-source',
  'edit-tests',
  'browser-checks',
  'edit-docs',
])

const fail = (message) => ({ allowed: false, errors: [message] })

export function authorizeCapability({ agentId, role, action, skill, repository, agents }) {
  const agent = agents.find((candidate) => candidate.id === agentId)
  if (!agent) return fail(`unknown or unregistered agent: ${agentId}`)
  if (agent.status !== 'active') return fail(`agent is not active: ${agentId}`)
  if (!role) return fail('capability check requires the agent role')
  if (agent.role !== role) return fail(`persona role mismatch: ${agentId} is ${agent.role}, not ${role}`)
  if (!skill) return fail('capability check requires a declared skill')
  if (!agent.skills?.includes(skill)) return fail(`${agentId} does not declare skill: ${skill}`)
  if (!repository) return fail('capability check requires a target repository')
  if (!agent.repositories?.includes(repository)) return fail(`${agentId} cannot act on repository: ${repository}`)
  if (agent.forbidden?.includes(action)) return fail(`${agentId} is forbidden from action: ${action}`)
  if (!knownActions.has(action)) return fail(`unknown action is blocked: ${action}`)
  if (!agent.permissions?.includes(action)) return fail(`${agentId} lacks permission for action: ${action}`)

  return { allowed: true, errors: [] }
}

export async function validateStaticCapabilities() {
  const errors = []
  const registry = await readText('agents/registry.yaml')
  const agents = parseRegistryAgents(registry)

  if (agents.some((agent) => !agent.skills?.length)) errors.push('every active agent must declare at least one skill')
  for (const agent of agents) {
    for (const action of agent.permissions ?? []) {
      if (!knownActions.has(action)) errors.push(`${agent.id} declares unknown capability: ${action}`)
    }
  }

  const profiles = await Promise.all(
    agents.map(async (agent) => {
      try {
        return await readText(`agents/${agent.id}.md`)
      } catch {
        errors.push(`${agent.id} profile is missing for capability boundary`)
        return ''
      }
    }),
  )
  for (const [index, profile] of profiles.entries()) {
    if (!/^---\n[\s\S]*\n---/m.test(profile)) errors.push(`${agents[index].id} profile has no persona frontmatter`)
  }

  try {
    const schema = JSON.parse(await readText('contracts/capability-check.schema.json'))
    for (const field of ['agentId', 'role', 'action', 'skill', 'repository']) {
      if (!schema.required?.includes(field)) errors.push(`capability schema requires ${field}`)
    }
    if (schema.additionalProperties !== false) errors.push('capability schema must reject additional properties')
  } catch (error) {
    errors.push(`capability schema is invalid: ${error.message}`)
  }

  return { allowed: errors.length === 0, errors }
}

async function loadAgents() {
  return parseRegistryAgents(await readText('agents/registry.yaml'))
}

async function readRequest(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const requestIndex = process.argv.indexOf('--request')
  const args = {
    agentId: process.argv[process.argv.indexOf('--agent') + 1],
    role: process.argv[process.argv.indexOf('--role') + 1],
    action: process.argv[process.argv.indexOf('--action') + 1],
    skill: process.argv[process.argv.indexOf('--skill') + 1],
    repository: process.argv[process.argv.indexOf('--repository') + 1],
  }

  let result
  try {
    const request = requestIndex >= 0 ? await readRequest(process.argv[requestIndex + 1]) : args
    result = requestIndex >= 0
      ? authorizeCapability({ ...request, agents: await loadAgents() })
      : await validateStaticCapabilities()
  } catch (error) {
    result = { allowed: false, errors: [`capability request could not be read: ${error.message}`] }
  }

  const passed = printResult('capability-guard', result.errors)
  if (!passed || !result.allowed) process.exitCode = 1
}
