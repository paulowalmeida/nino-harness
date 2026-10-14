import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRegistryAgents } from '../utils.mjs'
import { authorizeCapability, validateStaticCapabilities } from '../capability-guard.mjs'
import { readFile } from 'node:fs/promises'

const registry = await readFile(new URL('../../agents/registry.yaml', import.meta.url), 'utf8')
const agents = parseRegistryAgents(registry)

test('blocks an agent action outside its persona permissions', () => {
  const result = authorizeCapability({
    agents,
    agentId: 'product-owner',
    role: 'product-owner',
    action: 'edit-source',
    skill: 'business-discovery',
    repository: 'nino-app',
  })

  assert.equal(result.allowed, false)
  assert.match(result.errors.join('\n'), /forbidden|lacks permission/i)
})

test('allows a backend specialist only within its declared skill and repository', () => {
  const result = authorizeCapability({
    agents,
    agentId: 'backend-dev',
    role: 'implementer',
    action: 'edit-source',
    skill: 'nestjs',
    repository: 'nino-api',
  })

  assert.deepEqual(result, { allowed: true, errors: [] })
})

test('blocks a valid agent using another agent skill', () => {
  const result = authorizeCapability({
    agents,
    agentId: 'backend-dev',
    role: 'implementer',
    action: 'edit-source',
    skill: 'react',
    repository: 'nino-api',
  })

  assert.equal(result.allowed, false)
  assert.match(result.errors.join('\n'), /does not declare skill/i)
})

test('capability artifacts and declarations are structurally valid', async () => {
  assert.deepEqual(await validateStaticCapabilities(), { allowed: true, errors: [] })
})
