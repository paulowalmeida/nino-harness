import { spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { resolve, sep, join } from 'node:path'
import { harnessRoot } from '../hooks/utils.mjs'

const workspaceRoot = resolve(harnessRoot, '..')

function isRetryable(error) {
  if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return false
  if (error?.contractFailure || error?.approvalFailure) return false
  return true
}

function timeoutSignal(signal, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`Agent timeout after ${timeoutMs}ms`)), timeoutMs)
  const abort = () => controller.abort(signal.reason ?? new Error('Agent execution cancelled'))
  if (signal) {
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  }
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    },
  }
}

function repositoryDirectory(repository) {
  if (!repository || repository === '*') return null
  const target = resolve(workspaceRoot, repository)
  if (!target.startsWith(`${workspaceRoot}${sep}`)) return null
  return target
}

/** Spawns a local, already-authenticated CLI and collects stdout/stderr. */
function runCli({ command, args, cwd, signal, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      fn(value)
    }
    const onAbort = () => {
      child.kill('SIGTERM')
      const reason = signal.reason ?? new Error('Agent execution cancelled')
      const details = (stderr || stdout).trim().slice(0, 1000)
      const suffix = details ? `; output: ${details}` : ''
      finish(reject, new Error(`${reason.message}; command: ${command}${suffix}`))
    }
    if (signal) {
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort, { once: true })
    }

    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => finish(reject, error))
    child.on('close', (code) => {
      if (code === 0) finish(resolvePromise, { stdout, stderr })
      else finish(reject, new Error(`${command} exited with code ${code}: ${(stderr || stdout).slice(0, 2000)}`))
    })
  })
}

/** Runs `attempt()` under a per-call timeout/abort signal, retrying transient failures. */
async function withRetry({ attempt, signal, maxRetries, timeoutMs, telemetry, agentId }) {
  let attemptNumber = 0
  while (true) {
    const execution = timeoutSignal(signal, timeoutMs)
    try {
      return await attempt(execution.signal)
    } catch (error) {
      if (signal?.aborted || attemptNumber >= maxRetries || !isRetryable(error)) throw error
      attemptNumber += 1
      await telemetry.event({ type: 'agent-retry', agentId, attempt: attemptNumber, error: error.message })
    } finally {
      execution.dispose()
    }
  }
}

function parseClaudeOutput(stdout) {
  const line = stdout.trim().split('\n').filter(Boolean).pop()
  if (!line) throw new Error('claude returned no output')
  let parsed
  try {
    parsed = JSON.parse(line)
  } catch {
    throw new Error(`claude returned non-JSON output: ${line.slice(0, 500)}`)
  }
  if (parsed.is_error) throw new Error(parsed.result || 'claude reported an error')
  if (typeof parsed.result !== 'string') throw new Error('claude output is missing the "result" field')
  return { output: parsed.result, sessionId: parsed.session_id ?? null, usage: parsed.usage ?? null }
}

/**
 * Runs each harness agent as a headless Claude Code turn (`claude -p`) on the
 * local machine. This depends only on an already-authenticated Claude Code
 * CLI (subscription or configured API key) -- no separate SDK, vendor key, or
 * external orchestration service.
 *
 * Claude Code uses its own native tools (Read, Bash, Edit, ...), scoped to the
 * target repository via `--add-dir` and gated by `permissionMode`. MCP is
 * forwarded through `mcpConfigPath`. The capability-gateway's fine-grained
 * per-tool allow/deny list (`runtime/tools/*.mjs`) is not enforced at this
 * layer yet; `capabilityGateway.authorize()` still runs before every stage and
 * blocks disallowed actions/repositories/skills.
 */
export function createClaudeCodeAgentRunner({
  command = process.env.NINO_CLAUDE_BIN ?? 'claude',
  model = process.env.NINO_CLAUDE_MODEL,
  // `plan` triggers Claude Code's interactive planning flow: it writes a
  // plan file and returns a prose summary referencing it instead of the
  // requested output, which breaks every JSON-contract stage. `dontAsk`
  // still denies edits/risky actions without a plan-file detour or an
  // interactive hang -- it returns the agent's direct answer.
  permissionMode = process.env.NINO_CLAUDE_PERMISSION_MODE ?? 'dontAsk',
  permissionPrompts = process.env.NINO_CLAUDE_PERMISSION_PROMPTS ?? 'none',
  mcpConfigPath = process.env.NINO_MCP_CONFIG_PATH,
  maxRetries = 2,
  timeoutMs = 300000,
} = {}) {
  return async function runAgent({
    agent, profile, prompt, repository, telemetry, signal,
    maxRetries: requestedMaxRetries, timeoutMs: requestedTimeoutMs, session,
  }) {
    const args = ['-p', prompt, '--output-format', 'json', '--append-system-prompt', profile, '--permission-mode', permissionMode, '--permission-prompts', permissionPrompts]
    if (model) args.push('--model', model)
    const directory = repositoryDirectory(repository)
    if (directory) args.push('--add-dir', directory)
    if (mcpConfigPath) args.push('--mcp-config', mcpConfigPath)
    const resumeSessionId = await session?.get?.()
    if (resumeSessionId) args.push('--resume', resumeSessionId)

    const endSpan = telemetry.startSpan('agent', { agentId: agent.id, model: model ?? 'default', backend: 'claude' })
    try {
      const result = await withRetry({
        signal,
        maxRetries: requestedMaxRetries ?? maxRetries,
        timeoutMs: requestedTimeoutMs ?? timeoutMs,
        telemetry,
        agentId: agent.id,
        attempt: async (turnSignal) => {
          const cliResult = await runCli({ command, args, cwd: directory ?? workspaceRoot, signal: turnSignal })
          try {
            return parseClaudeOutput(cliResult.stdout)
          } catch (error) {
            if (cliResult.stderr) error.message += `; stderr: ${cliResult.stderr.slice(0, 1000)}`
            throw error
          }
        },
      })
      if (result.sessionId) await session?.set?.(result.sessionId)
      await endSpan({ status: 'DONE', usage: result.usage, attempts: 1 })
      return { output: result.output, usage: result.usage }
    } catch (error) {
      await endSpan({ status: 'FAILED', error: error.message })
      throw error
    }
  }
}

function parseCodexEvents(stdout) {
  let threadId = null
  let usage = null
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type === 'thread.started') threadId = event.thread_id
    if (event.type === 'turn.completed') usage = event.usage ?? usage
    if (event.type === 'turn.failed') throw new Error(event.error?.message ?? 'codex reported a failed turn')
  }
  return { threadId, usage }
}

function tomlString(value) {
  return JSON.stringify(value)
}

function tomlInlineTable(value) {
  return `{ ${Object.entries(value).map(([key, entry]) => `${tomlString(key)} = ${tomlString(entry)}`).join(', ')} }`
}

function codexMcpOverrides(mcpConfig) {
  const servers = mcpConfig?.mcpServers ?? {}
  const overrides = []
  for (const [name, server] of Object.entries(servers)) {
    if (server.type && server.type !== 'stdio') {
      throw new Error(`Codex runner supports only stdio MCP servers; configure ${name} through NINO_MCP_COMMAND or an MCP proxy`)
    }
    if (!server.command) continue
    overrides.push('--config', `mcp_servers.${name}.command=${tomlString(server.command)}`)
    if (server.args?.length) overrides.push('--config', `mcp_servers.${name}.args=${tomlString(server.args)}`)
    if (server.env && Object.keys(server.env).length > 0) {
      overrides.push('--config', `mcp_servers.${name}.env=${tomlInlineTable(server.env)}`)
    }
  }
  return overrides
}

/**
 * Runs each harness agent as a headless Codex CLI turn (`codex exec`) on the
 * local machine, using an already-authenticated Codex/ChatGPT login -- no
 * `OPENAI_API_KEY` required. Lets the same profiles/contracts/workflow that
 * back `createClaudeCodeAgentRunner` execute with Codex instead of Claude, so
 * a run can pick either backend (or, stage by stage, both) without a vendor
 * SDK dependency.
 *
 * Codex uses its own native tools, scoped via `--add-dir` and gated by
 * `sandbox`. Stdio MCP servers are forwarded through native config overrides;
 * the capability-gateway's fine-grained per-tool allow/deny list remains a
 * preflight control until an in-process MCP bridge is restored.
 */
export function createCodexAgentRunner({
  command = process.env.NINO_CODEX_BIN ?? 'codex',
  model = process.env.NINO_CODEX_MODEL,
  sandbox = process.env.NINO_CODEX_SANDBOX ?? 'read-only',
  ephemeral = process.env.NINO_CODEX_EPHEMERAL === 'true',
  mcpConfig = null,
  maxRetries = 2,
  timeoutMs = 300000,
} = {}) {
  return async function runAgent({
    agent, profile, prompt, repository, telemetry, signal,
    maxRetries: requestedMaxRetries, timeoutMs: requestedTimeoutMs, session,
  }) {
    const directory = repositoryDirectory(repository)
    const fullPrompt = `${profile}\n\nCurrent assignment:\n${prompt}`
    const resumeThreadId = await session?.get?.()
    const outputDirectory = await mkdtemp(join(tmpdir(), 'nino-codex-'))
    const outputFile = join(outputDirectory, 'last-message.txt')
    const commonFlags = [...codexMcpOverrides(mcpConfig), '--json', '--output-last-message', outputFile]
    if (ephemeral && !resumeThreadId) commonFlags.push('--ephemeral')
    if (model) commonFlags.push('--model', model)
    // `resume` reuses the original session's sandbox/cwd; it does not accept
    // `--sandbox`/`--add-dir` again. `--` stops flag parsing so a prompt that
    // happens to start with `-` (e.g. a profile's `---` frontmatter) is never
    // mistaken for another option.
    const args = resumeThreadId
      ? ['exec', 'resume', resumeThreadId, ...commonFlags, '--', fullPrompt]
      : ['exec', '--sandbox', sandbox, ...(directory ? ['--add-dir', directory] : []), ...commonFlags, '--', fullPrompt]

    const endSpan = telemetry.startSpan('agent', { agentId: agent.id, model: model ?? 'default', backend: 'codex' })
    try {
      if (!ephemeral && !resumeThreadId) {
        const configuredHome = process.env.CODEX_HOME ?? join(homedir(), '.codex')
        try {
          await access(configuredHome, constants.W_OK)
        } catch {
          throw new Error(`Codex requires a writable CODEX_HOME (${configuredHome}); set CODEX_HOME to a writable authenticated Codex home or use --codex-ephemeral`)
        }
      }
      const result = await withRetry({
        signal,
        maxRetries: requestedMaxRetries ?? maxRetries,
        timeoutMs: requestedTimeoutMs ?? timeoutMs,
        telemetry,
        agentId: agent.id,
        attempt: async (turnSignal) => {
          const { stdout } = await runCli({ command, args, cwd: directory ?? workspaceRoot, signal: turnSignal })
          const events = parseCodexEvents(stdout)
          const output = (await readFile(outputFile, 'utf8')).trim()
          if (!output) throw new Error('codex produced no final message')
          return { output, sessionId: events.threadId, usage: events.usage }
        },
      })
      if (result.sessionId) await session?.set?.(result.sessionId)
      await endSpan({ status: 'DONE', usage: result.usage, attempts: 1 })
      return { output: result.output, usage: result.usage }
    } catch (error) {
      await endSpan({ status: 'FAILED', error: error.message })
      throw error
    } finally {
      await rm(outputDirectory, { recursive: true, force: true })
    }
  }
}

const backends = {
  claude: createClaudeCodeAgentRunner,
  codex: createCodexAgentRunner,
}

/** Picks the local CLI backend (`claude` or `codex`) by name, or `NINO_AGENT_RUNNER`. */
export function createAgentRunner({ backend = process.env.NINO_AGENT_RUNNER ?? 'claude', ...options } = {}) {
  const factory = backends[backend]
  if (!factory) throw new Error(`Unknown agent runner backend: ${backend} (expected one of ${Object.keys(backends).join(', ')})`)
  return factory(options)
}

export function createScriptedAgentRunner(outputs = {}) {
  return async function runAgent({ agent, prompt, stageId, signal }) {
    if (signal?.aborted) throw signal.reason ?? new Error('Agent execution cancelled')
    const selected = outputs[stageId] ?? outputs[agent.id]
    const output = typeof selected === 'function' ? await selected({ prompt, stageId }) : selected
    if (!output) throw new Error(`No scripted output for ${agent.id}`)
    return { output: typeof output === 'string' ? output : JSON.stringify(output), usage: null }
  }
}
