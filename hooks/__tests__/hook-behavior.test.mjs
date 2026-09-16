import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluateAssertion } from '../../evals/assertions.mjs'
import { findPortugueseLines } from '../language-guard.mjs'
import { parseInlineList, parseRegistryAgents } from '../utils.mjs'

test('language detection handles accented, unaccented, and clean lines', () => {
  assert.equal(findPortugueseLines('Keep the workflow deterministic.').length, 0)
  assert.equal(findPortugueseLines('Não bypass the required evidence.').length, 1)
  assert.equal(findPortugueseLines('Nao bypass the required evidence.').length, 1)
})

test('inline list parsing trims quotes and ignores empty values', () => {
  assert.deepEqual(parseInlineList("[alpha, 'beta', \"gamma\", ]"), ['alpha', 'beta', 'gamma'])
  assert.deepEqual(parseInlineList('not-a-list'), [])
})

test('registry parsing preserves list and scalar fields', () => {
  const [agent] = parseRegistryAgents('  - id: qa\n    status: active\n    skills: [testing, audit]')
  assert.deepEqual(agent, { id: 'qa', status: 'active', skills: ['testing', 'audit'] })
})

test('assertions return diagnostics and reject unknown types', async () => {
  const positive = await evaluateAssertion({
    type: 'file_contains',
    path: 'README.md',
    pattern: 'evals/',
  })
  assert.equal(positive.pass, true)
  assert.match(positive.evidence, /contains expected pattern/)

  const unknown = await evaluateAssertion({ type: 'unsupported' })
  assert.equal(unknown.pass, false)
  assert.match(unknown.evidence, /unknown assertion type/)
})
