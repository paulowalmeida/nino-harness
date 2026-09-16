import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { harnessRoot, printResult } from './utils.mjs'

const retainedDirectory = join(harnessRoot, 'feedback', 'retained')
const errors = []
let entries = []

try {
  entries = await readdir(retainedDirectory, { withFileTypes: true })
} catch {
  entries = []
}

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.json')) continue

  const relativePath = `feedback/retained/${entry.name}`
  let record
  try {
    record = JSON.parse(await readFile(join(retainedDirectory, entry.name), 'utf8'))
  } catch {
    errors.push(`${relativePath}: invalid JSON`)
    continue
  }

  for (const field of ['id', 'runId', 'createdAt', 'observation', 'classification', 'evidence', 'feedForward', 'decision', 'status']) {
    if (!(field in record)) errors.push(`${relativePath}: missing ${field}`)
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id ?? '')) errors.push(`${relativePath}: invalid id`)
  if (!Array.isArray(record.evidence) || record.evidence.length === 0) errors.push(`${relativePath}: evidence must be non-empty`)
  if (!Array.isArray(record.feedForward) || record.feedForward.length === 0) errors.push(`${relativePath}: feedForward must be non-empty`)
  if (record.status !== 'promoted' || record.decision !== 'promote') errors.push(`${relativePath}: retained records must be promoted`)
  if (!record.target) errors.push(`${relativePath}: promoted record needs a target`)
  if (!record.promotion?.approvedBy || !record.promotion?.decisionId || !record.promotion?.scope) {
    errors.push(`${relativePath}: promotion approval metadata is incomplete`)
  }
}

const passed = printResult('feedback-guard', errors)
if (!passed) process.exitCode = 1
