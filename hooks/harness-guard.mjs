import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { harnessRoot } from './utils.mjs'

const hooks = [
  'registry-guard.mjs',
  'reference-guard.mjs',
  'profile-guard.mjs',
  'contract-guard.mjs',
  'secret-guard.mjs',
  'feedback-guard.mjs',
]

let failed = false
for (const hook of hooks) {
  const result = spawnSync(process.execPath, [join(harnessRoot, 'hooks', hook)], {
    cwd: harnessRoot,
    stdio: 'inherit',
  })
  if (result.status !== 0) failed = true
}

if (failed) {
  console.error('[FAIL] harness:guard')
  process.exitCode = 1
} else {
  console.log('[PASS] harness:guard')
}
