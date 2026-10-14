import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inferRepositories, requestFromPrompt } from '../prompt-request.mjs'

test('natural-language input preserves the user request and infers the frontend repository', () => {
  const prompt = 'Test the Balcão happy path in gestor-dev.nino.delivery.'
  const request = requestFromPrompt(prompt)

  assert.equal(request.objective, prompt)
  assert.equal(request.userPrompt, prompt)
  assert.equal(request.inputMode, 'natural-language')
  assert.deepEqual(request.repositories, ['nino-app'])
  assert.match(request.taskId, /^prompt-[a-f0-9]{10}$/)
})

test('natural-language input can target multiple repositories', () => {
  assert.deepEqual(
    inferRepositories('Update the API contract and its documentation.'),
    ['nino-api', 'nino-docs'],
  )
})

test('natural-language input falls back to the full Nino surface', () => {
  assert.deepEqual(inferRepositories('Review this cross-project request.'), [
    'nino-api',
    'nino-app',
    'nino-docs',
  ])
})

test('empty natural-language input is rejected', () => {
  assert.throws(() => requestFromPrompt('   '), /must not be empty/i)
})
