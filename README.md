# nino-harness

Shared harness for agents working across the Nino ecosystem.

## What lives here

- `agents/`: agent profiles and responsibilities;
- `adapters/`: how each repository loads the harness;
- `contracts/`: structured handoff and work-order formats;
- `rules/base/`: rules shared by all projects;
- `gates/`: shared quality checkpoints;
- `hooks/`: mechanical integrity checks for the harness itself;
- `evals/`: deterministic scenarios, assertions, metrics, and CI artifacts;
- `registry.yaml`: agent, permission, and capability catalog;
- `workflows/`: work sequences between agents;
- `templates/`: handoff, work-order, and optional report formats.

Hooks, gates, and rules that depend on repository structure remain in that
repository. The central harness defines the protocol; the local project
provides the technical implementation.

## Current profiles

- `product-owner`: business intake, acceptance, and business regression;
- `tech-lead`: planning, routing, and technical coordination;
- `backend-dev`: disciplined NestJS/Prisma implementation in `nino-api`;
- `frontend-dev`: disciplined Pages, facades, Hooks, state, and Design System
  implementation in `nino-app`;
- `qa`: surface discovery, functional validation, integration, and regression
  with evidence;
- `sre-platform`: environment readiness, Vercel delivery, observability, and
  rollback planning;
- `ux-ui`: defines implementation-ready Nino experiences before frontend work
  and verifies them after implementation;
- `architecture`, `testing`, `security`, `documentation`, and `release`:
  active specialist profiles.

## Default: native session

Start with [AGENTS.md](AGENTS.md) ([CLAUDE.md](CLAUDE.md) for Claude Code) and
[session-native](workflows/session-native.md). The current session is the
tech-lead: capture clear requests inline, discover native tools, and spawn only
needed specialists. No additional CLI, login, CODEX_HOME setup, separate PO,
or shell orchestration preflight is required. Native workflow precedence
overrides conflicting CLI-mode profile and base rules while preserving QA,
required repository checks, and consequential-action approvals.

Record real native IDs, wait for completion, and review delegated results.
Report unavailable capabilities honestly; app tasks are not native subagents.
Deterministic checks validate governance, not actual native invocation.

## Optional: CLI feature delivery

The opt-in structured CLI workflow is in `workflows/feature-delivery.yaml`. The
`agents/registry.yaml` file is a capability and permission catalog. The
workflow requires `tech-lead` to be the sole dispatcher and every specialist
execution to carry a validated `agent-dispatch` contract. Profiles and the
registry do not launch agents by themselves: the orchestration runtime must
enforce this boundary, and execution is `BLOCKED` when that runtime is
unavailable. Static harness checks validate the policy and contract shape; they
do not pretend to prove that an external runtime invoked an LLM.

The executable runtime is in `runtime/`. Use `npm run harness:plan` to inspect
the resolved workflow, or `npm run harness:run` to execute it locally through
the Claude Code CLI (`claude -p`) or the Codex CLI (`codex exec`, via
`--runner codex`) and persist resumable checkpoints. Both depend only on an
already-authenticated local CLI login -- no vendor SDK or API key.

## Harness gate

Before publishing changes to this repository, run:

```bash
npm run harness:guard
```

This command validates the registry, references, profiles, contracts,
language policy, and credential patterns. It does not replace project-specific
hooks and gates.

Run the deterministic evaluation suite with:

```bash
npm run evals:run
```

## Agent learning

Execution retrospectives and evaluations are temporary by default in
`/tmp/nino-harness-feedback/<run-id>`. The `learning-curator` may feed this
context into the next iteration and discard it afterward. Only approved,
evidenced lessons protected by a rule, Skill, hook, gate, documentation, or
test may enter `feedback/retained/`.

The harness guard validates retained records:

```bash
npm run harness:feedback:guard
```

## Evolution rule

Add a common rule here only when it applies to at least two projects. A rule
specific to NestJS, Prisma, Pages, Design System, or Docusaurus belongs in the
adapter and repository that own that context.
