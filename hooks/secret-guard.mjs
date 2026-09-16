import { readFile } from 'node:fs/promises'
import { listFiles, printResult, harnessRoot } from './utils.mjs'

const errors = []
const tokenPattern = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+)/

for (const relativePath of await listFiles('.')) {
  if (relativePath.startsWith('.git/')) continue
  const absolutePath = `${harnessRoot}/${relativePath}`
  let content
  try {
    content = await readFile(absolutePath, 'utf8')
  } catch {
    continue
  }

  if (tokenPattern.test(content)) errors.push(`possible credential in ${relativePath}`)
}

const passed = printResult('secret-guard', errors)
if (!passed) process.exitCode = 1
