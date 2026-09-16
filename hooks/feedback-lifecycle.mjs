import { rm } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

const [command, inputPath] = process.argv.slice(2)
const temporaryRoot = resolve(process.env.TMPDIR || '/tmp', 'nino-harness-feedback')

if (command !== 'discard' || !inputPath) {
  console.error('Usage: node hooks/feedback-lifecycle.mjs discard <temporary-run-directory>')
  process.exitCode = 1
} else {
  const target = resolve(inputPath)
  const relativeTarget = relative(temporaryRoot, target)
  const isInsideTemporaryRoot = isAbsolute(target) && relativeTarget !== '' && !relativeTarget.startsWith('..') && !isAbsolute(relativeTarget)

  if (!isInsideTemporaryRoot) {
    console.error(`Refusing to discard outside ${temporaryRoot}`)
    process.exitCode = 1
  } else {
    await rm(target, { recursive: true, force: true })
    console.log(`[PASS] discarded ephemeral feedback: ${target}`)
  }
}
