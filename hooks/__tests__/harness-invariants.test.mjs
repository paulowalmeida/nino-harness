import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { findPortugueseLines } from '../language-guard.mjs'
import { runEvaluations } from '../../evals/runners/eval-runner.mjs'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('language guard detects Brazilian Portuguese and accepts English', () => {
  assert.equal(findPortugueseLines('Define the business outcome and acceptance criteria.').length, 0)
  assert.equal(findPortugueseLines('Definir o critério de aceite do usuário.').length, 1)
})

test('product owner owns intake and mandatory business regression', async () => {
  const profile = await read('agents/product-owner.md')
  assert.match(profile, /business-brief/)
  assert.match(profile, /must always perform business regression/)
  assert.match(profile, /edit source code/i)
})

test('tech lead owns routing, iteration evidence, and feedback', async () => {
  const profile = await read('agents/tech-lead.md')
  assert.match(profile, /After every correction, return to QA for revalidation/)
  assert.match(profile, /stop repeating the same delegation/i)
  assert.match(profile, /feedback-record/)
})

test('workflow enforces PO intake, controlled QA loop, and business regression', async () => {
  const workflow = await read('workflows/feature-delivery.yaml')
  assert.ok(workflow.indexOf('id: product-intake') < workflow.indexOf('id: brief'))
  assert.match(workflow, /maxIterations: 3/)
  assert.ok(workflow.indexOf('id: business-regression') < workflow.indexOf('id: documentation'))
  assert.ok(workflow.indexOf('id: environment-readiness') < workflow.indexOf('id: backend'))
  assert.ok(workflow.indexOf('id: operations-review') < workflow.indexOf('id: documentation'))
})

test('security and SRE remain separate operational boundaries', async () => {
  const security = await read('agents/security.md')
  const sre = await read('agents/sre-platform.md')
  assert.match(security, /vulnerabil|IDOR|injection/i)
  assert.match(security, /accept risk/i)
  assert.match(sre, /Vercel/)
  assert.match(sre, /publish to production/i)
})

test('business contracts reject undocumented fields', async () => {
  for (const path of [
    'contracts/business-brief.schema.json',
    'contracts/business-regression.schema.json',
    'contracts/routing-decision.schema.json',
  ]) {
    const schema = JSON.parse(await read(path))
    assert.equal(schema.additionalProperties, false, path)
    assert.ok(schema.required.length > 0, path)
  }
})

test('deterministic eval runner emits honest metrics', async () => {
  const { payload, exitCode } = await runEvaluations()
  assert.equal(exitCode, 0)
  assert.equal(payload.metrics.scenarioCount, 12)
  assert.equal(payload.metrics.failed, 0)
  assert.equal(payload.metrics.humanInterventionRate, null)
  assert.equal(payload.metrics.selfCorrectionRate, null)
  assert.equal(payload.evaluationKind, 'deterministic-harness')
})
