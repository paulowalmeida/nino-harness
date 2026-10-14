# Session-native workflow (default)

## Precedence and intake

The active Codex or Claude Code session is the tech-lead and sole task
allocator. This workflow is the default and takes precedence over conflicting
requirements in AGENTS.md, profiles, base rules, gates, and registry metadata
for the optional feature-delivery CLI workflow. It does not modify CLI behavior.
Do not require a separate Product Owner, a new tech-lead invocation, shell
preflight hooks, serialized CLI contracts/checkpoints, another CLI, login, or
CODEX_HOME setup. Native tool permissions remain authoritative.

Capture objective, scope, acceptance criteria, and required output inline from
a clear user request. Ask only for missing decisions that materially affect
the task; do not ask again for authority already supplied. Use a Product Owner
specialist only when business ambiguity or acceptance work warrants one.
Read target instructions, applicable adapters and skills before work; discover
hidden `.agents` directories. For harness-only work there is no harness adapter.
Preserve unrelated staged and unstaged changes.

## Capability discovery and allocation

Inspect the current session's tool catalog before promising delegation,
including deferred tools through ALL_TOOLS when exposed. Discover the actual
callable native capabilities and their schemas; do not assume a tool name
means it is available. Codex uses native spawn/send/wait capabilities; Claude
Code uses native Agent/Task capabilities as available.

Spawn only necessary specialists. Do not automatically create an all-agent
team, or spawn agents merely to fill workflow stages. The active tech-lead may
perform scoped work directly when delegation adds no value or the user asks
for direct implementation. A dispatched specialist may implement explicitly
authorized work within its scope, including harness governance changes.

For a new or materially reshaped user-facing experience, dispatch `ux-ui`
before `frontend-dev` and review its `ux-design`; the implementation depends
on that approved design. Dispatch `ux-ui` again after implementation for
`ux-review` before technical QA. A backend-only or mechanical UI change may
skip design only when the task records evidence that no user-visible decision
changed.

If a nested tech-lead cannot spawn, the current host session may transport its
dispatch unchanged through available native tools. Preserve sourceAgent,
target, dependencies, scope, acceptance, and output; the nested tech-lead still
owns allocation and review. Do not claim the nested agent invoked the tool.

If native delegation is needed but unavailable after discovery, report the
missing capability and the affected work. Do not invent execution, agent IDs,
or use new app threads as substitutes. Lack of delegation tools does not block
separately authorized direct work; it never proves a delegation occurred.

## Dispatch and evidence

A dispatch may live in the native task message; no persisted CLI state or
schema-validation shell command is required. Include:

- id, sourceAgent: tech-lead, targetAgent, and status: READY;
- bounded task and repository/path scope, including exclusions;
- dependsOn (use [] for independent work);
- observable acceptanceCriteria and requiredOutput.

Start dependent work only after its dependencies complete and are reviewed.
Record the real returned native agent/task identifier alongside the dispatch
id; a logical dispatch id is not proof of a spawned agent. Record host
transport when used. Use the available native send/resume mechanism for
corrections and wait/join/completion mechanism before reviewing the result.
If a tool returns synchronously, its completed result supplies completion
evidence. Never treat dispatch, a pending task, or a static test as completion.

The tech-lead must review each result against scope, acceptance criteria,
changed files, checks, assumptions, and limitations. For transported work,
return evidence to the allocating tech-lead for review. Resolve overlap before
integration and revalidate corrections. No native invocation is proven by
deterministic governance tests: those validate policy only. Tool-returned IDs,
completion results, and review are the evidence of actual native execution.

## Verification and handoff

Preserve technical QA and every required repository check. Validate acceptance
criteria and affected business journeys when applicable; a separate PO agent
is optional, business acceptance evidence is not. Route defects to the needed
owner and revalidate after correction. Missing evidence remains NEEDS-EVIDENCE,
never PASS. Required consequential-action approvals still apply, including
production publication, destructive operations, and material scope changes;
honor approval already granted without redundant requests.

Return changed files, commands/results, decisions, risks, and unresolved work.
For harness changes run `npm run harness:test`, `npm run harness:guard`,
`npm run evals:run`, and `git diff --check`. Assess reusable lessons and update
the narrowest applicable artifact when the scope authorizes it. Do not launch
an LLM CLI merely to verify this workflow.
