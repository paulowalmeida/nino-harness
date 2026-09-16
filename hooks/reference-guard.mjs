import { access } from 'node:fs/promises'
import { join } from 'node:path'
import {
  harnessRoot,
  parseRegistryAgents,
  printResult,
  readText,
} from './utils.mjs'

const registry = await readText('agents/registry.yaml')
const agents = parseRegistryAgents(registry)
const errors = []
const warnings = []

async function exists(relativePath) {
  try {
    await access(join(harnessRoot, relativePath))
    return true
  } catch {
    return false
  }
}

for (const agent of agents) {
  const profilePath = `agents/${agent.id}.md`
  if (await exists(profilePath)) continue
  if (agent.status === 'active') errors.push(`${agent.id}: active profile is missing (${profilePath})`)
  else warnings.push(`${agent.id}: planned profile is not implemented (${profilePath})`)
}

for (const agent of agents) {
  if (agent.requiredAdapter && !(await exists(`adapters/${agent.requiredAdapter}.md`))) {
    errors.push(`${agent.id}: required adapter does not exist: ${agent.requiredAdapter}`)
  }

  if (agent.workflow && !(await exists(`workflows/${agent.workflow}.yaml`))) {
    errors.push(`${agent.id}: workflow does not exist: ${agent.workflow}`)
  }
}

const workflow = await readText('workflows/feature-delivery.yaml')
for (const match of workflow.matchAll(/^    agent: ([a-z0-9-]+)$/gm)) {
  const agent = agents.find((candidate) => candidate.id === match[1])
  if (!agent) errors.push(`workflow references unknown agent: ${match[1]}`)
  else if (agent.status === 'planned') warnings.push(`workflow stage uses planned agent: ${match[1]}`)
}

const passed = printResult('reference-guard', errors, warnings)
if (!passed) process.exitCode = 1
