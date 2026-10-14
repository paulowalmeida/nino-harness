import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { validateUxUiGovernance, validateUxUiWorkflow } from '../ux-ui-guard.mjs'

test('UX/UI governance is complete and internally consistent', async () => {
  assert.deepEqual(await validateUxUiGovernance(), { allowed: true, errors: [] })
})

test('UX/UI workflow blocks frontend implementation without prior design', async () => {
  const workflow = await readFile(new URL('../../workflows/feature-delivery.yaml', import.meta.url), 'utf8')
  const invalid = workflow.replace(
    'dependsOn: [contract, environment-readiness, ux-design]',
    'dependsOn: [contract, environment-readiness]',
  )

  assert.match(validateUxUiWorkflow(invalid).join('\n'), /frontend must depend on ux-design/)
})
