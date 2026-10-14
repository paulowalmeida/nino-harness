import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createWorkspaceTools } from '../tools/workspace-tools.mjs'
import { loadHarnessConfiguration } from '../loaders.mjs'
import { createRunState, JsonStateStore } from '../state-store.mjs'
import { RunTelemetry } from '../telemetry.mjs'
import { CapabilityGateway } from '../capability-gateway.mjs'

const tool = (name) => createWorkspaceTools().find((candidate) => candidate.name === name)

test('workspace tools read and search only inside repository boundaries', async () => {
  const readFile = tool('read_file')
  const searchText = tool('search_text')
  const readResult = JSON.parse(await readFile.execute({ repository: 'nino-harness', path: 'README.md' }))
  assert.equal(readResult.repository, 'nino-harness')
  assert.match(readResult.content, /Shared harness/i)
  const searchResult = JSON.parse(await searchText.execute({ repository: 'nino-harness', query: 'Shared harness', path: 'README.md' }))
  assert.match(searchResult.stdout, /Shared harness/)
  await assert.rejects(() => readFile.execute({ repository: 'nino-harness', path: '../nino-api/.env' }), /escapes repository boundary/i)
  await assert.rejects(() => readFile.execute({ repository: 'nino-harness', path: '.env' }), /sensitive path/i)
})

test('workspace command tool blocks destructive command patterns', async () => {
  const runCheck = tool('run_check')
  await assert.rejects(() => runCheck.execute({ repository: 'nino-harness', command: 'git', args: ['reset', '--hard'] }), /blocked/i)
  await assert.rejects(() => runCheck.execute({ repository: 'nino-harness', command: 'node', args: ['-e', 'process.exit(0)'] }), /blocked/i)
})

test('capability gateway binds wildcard tools to the invoking agent', async () => {
  const configuration = await loadHarnessConfiguration()
  const directory = await mkdtemp(join(tmpdir(), 'nino-harness-tools-'))
  try {
    const state = createRunState({ runId: 'run-tools', request: { repositories: ['nino-app'] } })
    state.businessBrief = { id: 'brief-tools', status: 'APPROVED' }
    state.techLeadInvocation = { id: 'invocation-tools', invokedBy: 'product-owner', targetAgent: 'tech-lead', status: 'READY' }
    state.dispatch = {
      id: 'dispatch-tools',
      taskId: 'task-tools',
      sourceAgent: 'tech-lead',
      targetAgent: 'qa',
      scope: ['nino-app'],
      acceptanceCriteria: ['List source files'],
      requiredOutput: 'tool-output',
      status: 'IN-PROGRESS',
    }
    const store = new JsonStateStore(directory)
    const gateway = new CapabilityGateway({
      configuration,
      state,
      stateStore: store,
      telemetry: new RunTelemetry(state, store),
      tools: new Map(createWorkspaceTools().map((candidate) => [candidate.name, candidate])),
    })
    const output = await gateway.executeTool('list_files', { repository: 'nino-app', path: '.' }, { agentId: 'qa' })
    assert.match(output, /"repository":"nino-app"/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('product owner receives only user-visible browser capabilities', async () => {
  const configuration = await loadHarnessConfiguration()
  const store = new JsonStateStore('/tmp/nino-harness-gateway-test')
  const state = createRunState({ runId: 'run-po-tools', request: {} })
  const gateway = new CapabilityGateway({
    configuration,
    state,
    stateStore: store,
    telemetry: new RunTelemetry(state, store),
    tools: new Map([...createWorkspaceTools(), ...[]].map((candidate) => [candidate.name, candidate])),
  })
  assert.deepEqual(gateway.definitionsFor('product-owner'), [])
})
