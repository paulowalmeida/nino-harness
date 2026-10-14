# Executable runtime

The runtime is the execution layer for the declarative harness. It loads the
registry, profiles, adapters, contracts, and workflow, then executes stages
through an injected agent runner.

## Natural-language entrypoint

The runtime accepts a natural-language request and keeps the original prompt
as the Product Owner's input. The runtime creates only the minimum request
envelope; the Product Owner remains responsible for business scope,
acceptance criteria, and critical journeys.

```bash
npm run harness:plan -- \
  --prompt "Test the Balcao happy path in gestor-dev.nino.delivery using synthetic data."
```

Execute the same request with:

```bash
NINO_BROWSER_ALLOWED_ORIGINS=https://gestor-dev.nino.delivery \
npm run harness:run -- \
  --prompt "Test the Balcao happy path in gestor-dev.nino.delivery using synthetic data." \
  --interactive-approvals
```

Execution requires the `claude` CLI on `PATH` and an already-authenticated
Claude Code session (subscription login or a configured API key) on the local
machine. No separate vendor SDK or API key is needed.

Use `--prompt-file <path>` for a multiline request. JSON input remains
available through `--request <path>` for automation and deterministic runs.

## Plan a run

```bash
npm run harness:plan -- --request ./request.json
```

## Execute a run

```bash
npm run harness:run -- \
  --request ./request.json \
  --approval-file ./approved-points.json
```

The approval file is a JSON array containing explicitly approved workflow
points, for example:

```json
["ownership-or-architecture", "contract"]
```

Runs are persisted as JSON checkpoints under `.runs/` by default. Resume a
waiting run with `--resume <run-id>` after adding the required approval points.
The runner persists one Claude Code session ID per agent inside the checkpoint
(`--resume <session-id>`), so resuming continues the same underlying
conversation. Use `--interactive-approvals` for terminal approval prompts,
`--max-retries <n>` for transient agent failures, and `--timeout-ms <n>` to
bound each agent turn.

The agent runner is a local CLI backend, picked with `--runner <claude|codex>`
(default `claude`, or `NINO_AGENT_RUNNER`):

- `claude` -- `createClaudeCodeAgentRunner` spawns `claude -p` for every
  stage, scoped via `--add-dir` and gated by `--permission-mode`
  (default `dontAsk`, which denies edits/risky actions without the
  interactive planning detour that `plan` mode adds);
- `codex` -- `createCodexAgentRunner` spawns `codex exec` (`codex exec resume
  <thread-id>` on later turns), scoped via `--add-dir` and gated by
  `--sandbox` (default `read-only`).

Both depend only on an already-authenticated local CLI (subscription login)
-- no vendor SDK, no separate API key. The runner is injectable, so
deterministic tests and other execution backends can use the same workflow
engine without changing governance artifacts.

Tool execution is not wired into this runner yet: Claude Code uses its own
native tools (Read, Bash, Edit, ...) instead of the capability-scoped tool
definitions in `runtime/tools/*.mjs`. `capabilityGateway.authorize()` still
runs before every stage and blocks disallowed actions, repositories, and
skills; the previous per-tool allow/deny layer (`workspace-tools.mjs`,
`browser-tools.mjs`, `mcp-tools.mjs`) is defined but not enforced at
execution time. Restoring it requires an in-process MCP bridge -- see
`runtime/tools/mcp-tools.mjs` for the current state.

## Nino integrations

`runtime/tools/mcp-tools.mjs` builds an MCP server descriptor
(`mcpServerConfig()`) for the Nino integration endpoint from `NINO_MCP_URL`,
`NINO_MCP_TOKEN`, `NINO_MCP_SSE_URL`, or `NINO_MCP_COMMAND`/`NINO_MCP_ARGS`,
shaped for Claude Code's own `--mcp-config`. It is not yet passed to
`createClaudeCodeAgentRunner`.

Use `--isolated` to create detached worktrees under the run directory.
Tracked changes and safe untracked files are copied into the isolated
checkout, while the main checkout remains untouched. Resume reuses the
recorded worktree paths.

The Claude runner disables unanswered permission prompts in headless mode and
passes the configured Nino MCP server through `--mcp-config`. The Codex runner
translates stdio MCP servers to native `mcp_servers.*` config overrides. Codex
requires a writable, authenticated `CODEX_HOME`; use `--codex-ephemeral` only
when the environment cannot persist Codex sessions and resumability is not
required.
