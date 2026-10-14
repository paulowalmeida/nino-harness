import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { loadHarnessConfiguration } from './loaders.mjs'
import { createRunState, JsonStateStore } from './state-store.mjs'
import { createAgentRunner } from './agent-runner.mjs'
import { WorkflowEngine } from './workflow-engine.mjs'
import { createWorkspaceTools } from './tools/workspace-tools.mjs'
import { createBrowserTools } from './tools/browser-tools.mjs'
import { ApprovalRequiredError } from './approval-manager.mjs'
import { createIsolatedWorktrees, rootsFromState } from './isolation/worktree-manager.mjs'
import { createMcpTools } from './tools/mcp-tools.mjs'
import { requestFromPrompt } from './prompt-request.mjs'

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const planOnly = process.argv.includes('--plan')
const execute = process.argv.includes('--execute')
const requestPath = argument('--request')
const prompt = argument('--prompt')
const promptPath = argument('--prompt-file')
const taskId = argument('--task-id')
const stateDirectory = resolve(argument('--state-dir') ?? '.runs')
const resumeRunId = argument('--resume')
const approvalPath = argument('--approval-file')
const interactiveApprovals = process.argv.includes('--interactive-approvals')
const isolated = process.argv.includes('--isolated')
const codexEphemeral = process.argv.includes('--codex-ephemeral')
const abortController = new AbortController()
process.once('SIGINT', () => abortController.abort(new Error('Workflow execution cancelled by SIGINT')))

if (!planOnly && !execute) {
  console.error('Use --plan or --execute')
  process.exitCode = 1
} else if (requestPath && (prompt || promptPath)) {
  console.error('Use exactly one input: --request, --prompt, or --prompt-file')
  process.exitCode = 1
} else if (!requestPath && !prompt && !promptPath) {
  console.error('Missing --request <path>, --prompt <text>, or --prompt-file <path>')
  process.exitCode = 1
} else {
  const request = requestPath
    ? JSON.parse(await readFile(resolve(requestPath), 'utf8'))
    : requestFromPrompt(
      promptPath ? await readFile(resolve(promptPath), 'utf8') : prompt,
      { taskId },
    )
  const configuration = await loadHarnessConfiguration()
  const stateStore = new JsonStateStore(stateDirectory)
  const state = resumeRunId
    ? await stateStore.load(resumeRunId)
    : createRunState({ runId: 'run-' + randomUUID(), request })
  const approvals = approvalPath ? JSON.parse(await readFile(resolve(approvalPath), 'utf8')) : []
  let roots = rootsFromState(state)
  if (execute && isolated && roots.size === 0) {
    if (!request.repositories?.length) throw new Error('--isolated requires request.repositories')
    const isolation = await createIsolatedWorktrees({
      runId: state.runId,
      repositories: request.repositories,
      state,
      stateStore,
    })
    roots = isolation.roots
  }
  const mcp = execute ? await createMcpTools() : { tools: [], close: async () => {} }
  const engine = new WorkflowEngine({
    configuration,
    stateStore,
    agentRunner: createAgentRunner({
      backend: argument('--runner'),
      permissionMode: argument('--permission-mode'),
      sandbox: argument('--sandbox'),
      ephemeral: codexEphemeral,
      mcpConfig: mcp.config,
      mcpConfigPath: mcp.mcpConfigPath,
    }),
    tools: new Map([...createWorkspaceTools({ roots }), ...createBrowserTools(), ...mcp.tools].map((tool) => [tool.name, tool])),
    request,
    state,
    approvedPoints: approvals,
    signal: abortController.signal,
    maxRetries: Number(argument('--max-retries') ?? 2),
    timeoutMs: Number(argument('--timeout-ms') ?? 300000),
  })

  if (planOnly) {
    console.log(JSON.stringify(await engine.plan(), null, 2))
  } else {
    try {
      let state
      while (true) {
        try {
          state = await engine.execute()
          break
        } catch (error) {
          if (!(interactiveApprovals && error instanceof ApprovalRequiredError)) throw error
          process.stdout.write(`Approval required for ${error.point}. Type 'approve' to continue or 'reject' to stop: `)
          const answer = await new Promise((resolveAnswer) => process.stdin.once('data', (data) => resolveAnswer(data.toString().trim().toLowerCase())))
          if (answer !== 'approve') throw new Error(`Approval rejected: ${error.point}`)
          await engine.approvalManager.approve(error.point)
        }
      }
      console.log(JSON.stringify({ runId: state.runId, status: state.status, stateFile: `${stateDirectory}/${state.runId}.json` }, null, 2))
    } catch (error) {
      console.error(JSON.stringify({ runId: error.runState?.runId ?? null, status: error.runState?.status ?? 'BLOCKED', error: error.message }, null, 2))
      process.exitCode = 1
    } finally {
      await mcp.close()
    }
  }
}
