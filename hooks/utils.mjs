import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const hooksDirectory = dirname(fileURLToPath(import.meta.url))
export const harnessRoot = resolve(hooksDirectory, '..')

export async function readText(relativePath) {
  return readFile(join(harnessRoot, relativePath), 'utf8')
}

export function parseInlineList(value) {
  const match = value.match(/^\[(.*)\]$/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

export function parseRegistryAgents(registry) {
  const agentBlocks = registry.split(/^  - id: /m).slice(1)

  return agentBlocks.map((block) => {
    const lines = block.split('\n')
    const agent = { id: lines[0].trim() }

    for (const line of lines.slice(1)) {
      const match = line.match(/^    ([A-Za-z]+):\s*(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      agent[key] = rawValue.startsWith('[')
        ? parseInlineList(rawValue)
        : rawValue.trim().replace(/^['"]|['"]$/g, '')
    }

    return agent
  })
}

export async function listFiles(relativeDirectory) {
  const directory = join(harnessRoot, relativeDirectory)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === '.git') continue
    const relativePath = join(relativeDirectory, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(relativePath)))
    else files.push(relativePath)
  }

  return files
}

export function printResult(name, errors, warnings = []) {
  for (const warning of warnings) console.warn(`[WARN] ${name}: ${warning}`)
  if (errors.length === 0) {
    console.log(`[PASS] ${name}`)
    return true
  }

  for (const error of errors) console.error(`[FAIL] ${name}: ${error}`)
  return false
}
