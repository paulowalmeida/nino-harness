import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { harnessRoot, listFiles, printResult } from './utils.mjs'

const humanArtifactExtensions = new Set(['.md', '.yaml', '.yml', '.json'])
const portugueseMarkers = /[áàâãéêíóôõúç]|\b(?:não|nao|deve|quando|relatório|relatorio|execução|execucao|evidência|evidencia|usuário|usuario|agente|implementação|implementacao|repositório|repositorio|coordena|liderar|definir|atualizar|projetar|auditar|executar)\b/i

function isHumanArtifact(path) {
  return humanArtifactExtensions.has(extname(path))
}

export function findPortugueseLines(text) {
  return text.split(/\r?\n/).flatMap((line, index) =>
    portugueseMarkers.test(line) ? [{ line: index + 1, text: line }] : [],
  )
}

export async function collectViolations() {
  const violations = []
  for (const path of await listFiles('')) {
    if (!isHumanArtifact(path)) continue
    const text = await readFile(`${harnessRoot}/${path}`, 'utf8')
    for (const match of findPortugueseLines(text)) violations.push(`${path}:${match.line} contains Brazilian Portuguese: ${match.text}`)
  }
  return violations
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = await collectViolations()
  const passed = printResult('language-guard', violations)
  if (!passed) process.exitCode = 1
}
