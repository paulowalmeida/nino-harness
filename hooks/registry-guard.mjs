import { parseRegistryAgents, printResult, readText } from './utils.mjs'

const registry = await readText('agents/registry.yaml')
const agents = parseRegistryAgents(registry)
const errors = []

if (!/^version:\s*1\s*$/m.test(registry)) {
  errors.push('registry.yaml must declare version: 1')
}

if (!/^agents:\s*$/m.test(registry)) errors.push('missing agents section')
if (agents.length === 0) errors.push('agents section must contain at least one agent')

const ids = new Set()
const allowedStatuses = new Set(['planned', 'active'])
const allowedRoles = new Set([
  'coordinator',
  'product-owner',
  'tech-lead',
  'operator',
  'specialist',
  'implementer',
  'reviewer',
  'verifier',
])

for (const agent of agents) {
  if (ids.has(agent.id)) errors.push(`duplicate agent id: ${agent.id}`)
  ids.add(agent.id)

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agent.id)) {
    errors.push(`invalid agent id: ${agent.id}`)
  }

  if (!allowedStatuses.has(agent.status)) errors.push(`${agent.id}: invalid status`)
  if (!allowedRoles.has(agent.role)) errors.push(`${agent.id}: invalid role`)
  if (!agent.mission) errors.push(`${agent.id}: missing mission`)
  if (!agent.repositories?.length) errors.push(`${agent.id}: missing repositories`)
  if (!agent.skills?.length) errors.push(`${agent.id}: missing skills`)
  if (!agent.permissions?.length) errors.push(`${agent.id}: missing permissions`)
  if (!agent.forbidden?.length) errors.push(`${agent.id}: missing forbidden actions`)
  if (!agent.output && !agent.outputs) errors.push(`${agent.id}: missing output/outputs`)
}

const passed = printResult('registry-guard', errors)
if (!passed) process.exitCode = 1
