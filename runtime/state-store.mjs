import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export class JsonStateStore {
  constructor(directory) {
    this.directory = directory
  }

  pathFor(runId) {
    return join(this.directory, `${runId}.json`)
  }

  async save(state) {
    await mkdir(this.directory, { recursive: true })
    const temporaryPath = join(this.directory, `.${state.runId}.${randomUUID()}.tmp`)
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, this.pathFor(state.runId))
    return this.pathFor(state.runId)
  }

  async load(runId) {
    return JSON.parse(await readFile(this.pathFor(runId), 'utf8'))
  }
}

/**
 * Persists the Claude Code CLI `--resume <session-id>` value per harness
 * agent slot, so a resumed run continues the same underlying conversation
 * instead of starting cold.
 */
export class CliSessionStore {
  constructor({ state, stateStore, sessionId }) {
    this.state = state
    this.stateStore = stateStore
    this.sessionId = sessionId
    this.state.sessions ??= {}
  }

  get() {
    return this.state.sessions[this.sessionId] ?? null
  }

  async set(claudeSessionId) {
    this.state.sessions[this.sessionId] = claudeSessionId
    await this.stateStore.save(this.state)
  }
}

export function createRunState({ runId, request, startedAt = new Date().toISOString() }) {
  return {
    schemaVersion: 2,
    runId,
    request,
    status: 'RUNNING',
    startedAt,
    updatedAt: startedAt,
    currentStage: null,
    stages: {},
    dispatches: [],
    approvals: [],
    events: [],
    outputs: {},
    businessBrief: null,
    techLeadInvocation: null,
    sessions: {},
    worktrees: {},
  }
}

export function recordEvent(state, event) {
  const timestamp = new Date().toISOString()
  state.events.push({ timestamp, ...event })
  state.updatedAt = timestamp
  return state
}
