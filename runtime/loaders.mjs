import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { harnessRoot, parseRegistryAgents } from '../hooks/utils.mjs'

async function read(relativePath) {
  return readFile(join(harnessRoot, relativePath), 'utf8')
}

export async function loadHarnessConfiguration() {
  const registryText = await read('agents/registry.yaml')
  const workflowText = await read('workflows/feature-delivery.yaml')
  const registryDocument = parseYaml(registryText)
  const workflow = parseYaml(workflowText)
  const registryAgents = parseRegistryAgents(registryText)
  const contractNames = [
    'business-brief',
    'work-order',
    'business-regression',
    'routing-decision',
    'security-review',
    'environment-plan',
    'operations-review',
    'qa-handoff',
    'ux-design',
    'ux-review',
  ]
  const contracts = new Map()
  for (const name of contractNames) contracts.set(name, JSON.parse(await read(`contracts/${name}.schema.json`)))
  const adapterNames = ['nino-api', 'nino-app', 'nino-docs']
  const adapters = new Map()
  for (const name of adapterNames) adapters.set(name, await read(`adapters/${name}.md`))

  return {
    registry: registryDocument,
    agents: registryAgents.map((agent) => ({
      ...agent,
      permissions: agent.permissions ?? [],
      forbidden: agent.forbidden ?? [],
      skills: agent.skills ?? [],
      repositories: agent.repositories ?? [],
    })),
    profiles: new Map(
      await Promise.all(
        registryAgents.map(async (agent) => [agent.id, await read(`agents/${agent.id}.md`)]),
      ),
    ),
    adapters,
    contracts,
    workflow,
  }
}

export function findAgent(configuration, agentId) {
  const agent = configuration.agents.find((candidate) => candidate.id === agentId)
  if (!agent) throw new Error(`Unknown agent: ${agentId}`)
  return agent
}

export function findStage(configuration, stageId) {
  const stage = configuration.workflow.stages?.find((candidate) => candidate.id === stageId)
  if (!stage) throw new Error(`Unknown workflow stage: ${stageId}`)
  return stage
}
