import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePreflight, validateStaticPreflight } from '../orchestration-preflight.mjs'

const state = {
  runId: 'run-1',
  businessBrief: { id: 'brief-1', status: 'APPROVED' },
  techLeadInvocation: {
    id: 'invocation-1',
    invokedBy: 'product-owner',
    targetAgent: 'tech-lead',
    status: 'READY',
  },
}

test('blocks host technical inspection', () => {
  const result = validatePreflight({
    state,
    actor: 'host',
    action: 'host-technical-inspection',
  })

  assert.equal(result.blocked, true)
  assert.match(result.errors.join('\n'), /host and product-owner technical actions are blocked/i)
})

test('blocks specialist work without dispatch', () => {
  const result = validatePreflight({
    state,
    actor: 'specialist',
    action: 'specialist-technical-inspection',
  })

  assert.equal(result.blocked, true)
  assert.match(result.errors.join('\n'), /requires an agent-dispatch/i)
})

test('allows specialist work with a valid tech-lead dispatch', () => {
  const result = validatePreflight({
    state: {
      ...state,
      dispatch: {
        id: 'dispatch-1',
        taskId: 'invocation-1',
        sourceAgent: 'tech-lead',
        targetAgent: 'qa',
        scope: ['counter flow'],
        acceptanceCriteria: ['return reproducible evidence'],
        requiredOutput: 'qa-handoff',
        status: 'READY',
      },
    },
    actor: 'specialist',
    action: 'specialist-technical-inspection',
  })

  assert.deepEqual(result, { blocked: false, errors: [] })
})

test('has all static preflight artifacts', async () => {
  assert.deepEqual(await validateStaticPreflight(), { blocked: false, errors: [] })
})
