import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { printResult, readText } from './utils.mjs'

const staticFiles = [
  'AGENTS.md',
  'rules/base/orchestration-preflight.md',
  'gates/orchestration-preflight.md',
  'contracts/orchestration-preflight.schema.json',
  'workflows/feature-delivery.yaml',
]

const technicalActions = new Set([
  'technical-read',
  'technical-inspection',
  'host-technical-inspection',
  'specialist-technical-inspection',
  'implementation',
  'test',
  'deployment',
])

const fail = (message) => ({ blocked: true, errors: [message] })

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateBusinessHandoff(state, errors) {
  if (!state || typeof state !== 'object') {
    errors.push('orchestration state is required')
    return
  }

  if (!hasText(state.runId)) errors.push('orchestration state requires runId')

  const brief = state.businessBrief
  if (!brief || brief.status !== 'APPROVED' || !hasText(brief.id)) {
    errors.push('requires an approved business-brief')
  }

  const invocation = state.techLeadInvocation
  if (
    !invocation ||
    !hasText(invocation.id) ||
    invocation.invokedBy !== 'product-owner' ||
    invocation.targetAgent !== 'tech-lead' ||
    !['INVOKED', 'READY', 'IN-PROGRESS'].includes(invocation.status)
  ) {
    errors.push('requires exactly one tech-lead agent invocation by product-owner')
  }
}

function validateDispatch(state, errors) {
  const dispatch = state?.dispatch
  if (!dispatch) {
    errors.push('specialist technical work requires an agent-dispatch')
    return
  }

  if (
    !hasText(dispatch.id) ||
    dispatch.sourceAgent !== 'tech-lead' ||
    !hasText(dispatch.targetAgent) ||
    dispatch.targetAgent === 'tech-lead' ||
    !hasText(dispatch.taskId) ||
    !Array.isArray(dispatch.scope) ||
    dispatch.scope.length === 0 ||
    !Array.isArray(dispatch.acceptanceCriteria) ||
    dispatch.acceptanceCriteria.length === 0 ||
    !hasText(dispatch.requiredOutput) ||
    !['READY', 'IN-PROGRESS', 'DONE'].includes(dispatch.status)
  ) {
    errors.push('agent-dispatch is malformed or not issued by tech-lead')
  }
}

export function validatePreflight({ state, actor, action }) {
  if (!hasText(actor)) return fail('preflight requires an actor')
  if (!hasText(action)) return fail('preflight requires an action')
  if (!technicalActions.has(action)) return { blocked: false, errors: [] }

  const errors = []
  validateBusinessHandoff(state, errors)

  if (actor === 'host' || actor === 'product-owner') {
    errors.push(
      'host and product-owner technical actions are blocked; route through tech-lead and a specialist dispatch',
    )
  } else if (actor === 'tech-lead' && action === 'implementation') {
    errors.push('tech-lead is read-only and cannot implement')
  } else if (actor !== 'specialist' && actor !== 'tech-lead') {
    errors.push(`unsupported technical actor: ${actor}`)
  }

  if (actor === 'specialist') validateDispatch(state, errors)

  return { blocked: errors.length > 0, errors }
}

export async function validateStaticPreflight() {
  const errors = []

  for (const path of staticFiles) {
    try {
      await readText(path)
    } catch (error) {
      errors.push(`missing preflight artifact ${path}: ${error.message}`)
    }
  }

  try {
    const schema = JSON.parse(await readText('contracts/orchestration-preflight.schema.json'))
    for (const field of ['runId', 'businessBrief', 'techLeadInvocation']) {
      if (!schema.required?.includes(field)) errors.push(`preflight schema requires ${field}`)
    }
    if (schema.additionalProperties !== false) {
      errors.push('preflight schema must reject additional properties')
    }
  } catch (error) {
    errors.push(`preflight schema is invalid: ${error.message}`)
  }

  return { blocked: errors.length > 0, errors }
}

async function readManifest(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifestIndex = process.argv.indexOf('--manifest')
  const actorIndex = process.argv.indexOf('--actor')
  const actionIndex = process.argv.indexOf('--action')
  const manifestPath = manifestIndex >= 0 ? process.argv[manifestIndex + 1] : null
  const actor = actorIndex >= 0 ? process.argv[actorIndex + 1] : null
  const action = actionIndex >= 0 ? process.argv[actionIndex + 1] : null

  let result
  try {
    result = manifestPath
      ? validatePreflight({ state: await readManifest(manifestPath), actor, action })
      : await validateStaticPreflight()
  } catch (error) {
    result = { blocked: true, errors: [`preflight manifest could not be read: ${error.message}`] }
  }

  const passed = printResult('orchestration-preflight', result.errors)
  if (!passed || result.blocked) process.exitCode = 1
}
