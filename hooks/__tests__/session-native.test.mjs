import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

// Policy regression checks only: these tests never invoke a native agent.
test('native precedence is reachable from both entrypoints and conflicting rules', async () => {
  for (const path of [
    'AGENTS.md', 'CLAUDE.md', 'README.md',
    'agents/tech-lead.md', 'agents/product-owner.md', 'agents/architecture.md',
    'rules/base/orchestration-preflight.md', 'rules/base/capability-boundary.md',
    'workflows/feature-delivery.md', 'workflows/feature-delivery.yaml',
  ]) {
    assert.match(await read(path), /session-native\.md/, path)
  }
  const policy = await read('workflows/session-native.md')
  assert.match(policy, /default and takes precedence/)
  assert.match(policy, /Do not require a separate Product Owner/)
  assert.match(policy, /shell\npreflight hooks, serialized CLI contracts\/checkpoints/)
  assert.match(policy, /active Codex or Claude Code session is the tech-lead/)
  assert.match(policy, /scope, acceptance criteria, and required output inline/)
})

test('native policy covers discovery, host transport, unavailable tools and real evidence', async () => {
  const policy = await read('workflows/session-native.md')
  for (const pattern of [
    /deferred tools through ALL_TOOLS/,
    /Codex uses native spawn\/send\/wait/,
    /Claude\nCode uses native Agent\/Task/,
    /Spawn only necessary specialists/,
    /user asks\nfor direct implementation/,
    /host session may transport its\ndispatch unchanged/,
    /nested tech-lead still\nowns allocation and review/,
    /Do not invent execution, agent IDs,\nor use new app threads as substitutes/,
    /real returned native agent\/task identifier/,
    /wait\/join\/completion mechanism before reviewing/,
    /Start dependent work only after its dependencies complete and are reviewed/,
    /sourceAgent: tech-lead, targetAgent, and status: READY/,
    /dependsOn \(use \[\] for independent work\)/,
    /acceptanceCriteria and requiredOutput/,
    /No native invocation is proven by\ndeterministic governance tests/,
  ]) assert.match(policy, pattern)
})

test('native mode retains verification and approvals without changing CLI enforcement', async () => {
  const policy = await read('workflows/session-native.md')
  assert.match(policy, /Preserve technical QA and every required repository check/)
  assert.match(policy, /business acceptance evidence is not/)
  assert.match(policy, /Required consequential-action approvals still apply/)
  assert.match(policy, /honor approval already granted without redundant requests/)
  for (const command of ['npm run harness:test', 'npm run harness:guard', 'npm run evals:run', 'git diff --check']) {
    assert.ok(policy.includes(command), command)
  }
  const cli = await read('workflows/feature-delivery.yaml')
  assert.match(cli, /executionMode: delegated-only/)
  assert.match(cli, /preflightHook: hooks\/orchestration-preflight.mjs/)
  assert.match(cli, /hostTechnicalActions: BLOCKED/)
})
