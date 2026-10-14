# Nino Agent Harness

This project is the shared governance layer for Nino agents. It coordinates
work across `nino-api`, `nino-app`, and `nino-docs`; repository-specific rules
remain mandatory.

## Default execution mode and precedence

Use [session-native](workflows/session-native.md) by default in an active
Codex or Claude Code session. Read that workflow before applying profiles or
base rules. The active session is the tech-lead; a clear user request supplies
inline intake. Spawn only necessary specialists using native session tools.

For native execution, that workflow takes precedence over conflicting
orchestration, Product Owner, preflight, capability, and mandatory delegation
requirements below, in profiles, base rules, gates, and the registry. In
particular, no separate Product Owner or tech-lead invocation, shell preflight,
CLI state, extra CLI, login, or CODEX_HOME setup is required. Explicit user
instructions govern scope and authorized direct work. Technical QA,
repository checks, evidence, and consequential-action approvals still apply.

The strict bootstrap and runtime enforcement rules below describe the optional
`workflows/feature-delivery.yaml` CLI mode, selected only when explicitly
requested. They do not block native discovery, review, or authorized edits.

## Loading order

Before acting, the agent must:

1. identify the repository and the task's actual scope;
2. read the corresponding adapter under `adapters/`, when one exists;
3. read the local `.agents/AGENTS.md`, when present;
4. read the rules and skills applicable to the target repository;
5. identify hooks, gates, tests, and contracts that the change may affect;
6. only then propose or execute work.

## Harness language rule

All harness artifacts must be written in English. This includes agent
profiles, instructions, adapters, workflows, gates, templates, registries,
handoff contracts, and any persisted harness output. Do not write Brazilian
Portuguese in the harness. `harness:language` mechanically checks all
human-readable harness artifacts and must pass with the other harness gates.

## Tech Lead / orchestrator rule

`tech-lead` is the technical lead and the sole task allocator for delivery. The
Product Owner invokes exactly one downstream agent: `tech-lead`. The host agent
must invoke `tech-lead` first after the Product Owner's approved
`business-brief`; neither the Product Owner nor the host agent may create,
invoke, or dispatch any other agent directly. `tech-lead` creates and allocates
the remaining specialist tasks. It is read-only by default: it investigates, plans,
classifies dependencies, reviews results, and issues the machine-readable
`agent-dispatch` contract to the approved specialist agents.

The `tech-lead` must not implement production code, tests, documentation, or
infrastructure changes. Every specialist action requires a valid dispatch with
`sourceAgent: tech-lead`, an explicit target, scope, dependencies, acceptance
criteria, and required output. If the orchestration runtime cannot issue or
verify that dispatch, the execution is `BLOCKED`; direct implementation is not
a fallback.

The registry and profiles describe policy but do not launch agents. An
orchestration runtime must enforce the dispatch boundary and preserve the
delegation graph throughout the execution.

## Orchestration preflight rule

Before any technical read, check, browser inspection, gate, implementation,
test, or deployment, the runtime must execute
`hooks/orchestration-preflight.mjs`. The Product Owner and the host agent must not read target-repository source or perform technical inspection. The
preflight requires an approved `business-brief`, exactly one Product Owner to
Tech Lead handoff, and a valid specialist dispatch. Missing or unverifiable
state is `BLOCKED`; direct host implementation is never a fallback.

## Product Owner rule

The `product-owner` agent owns the business intake: user intent, priority,
scope, acceptance criteria, and critical business journeys. It hands an
approved `business-brief` to `tech-lead`, which converts it into the technical
work order and creates the remaining specialized tasks. The Product Owner may
invoke only the `tech-lead` agent; it must not create or route specialists.

The `product-owner` must always perform business regression after the final
technical QA/correction loop and before release. This validates acceptance
criteria and critical journeys from the user's perspective; it does not
replace QA's functional, integration, security, accessibility, or technical
regression checks. A failed or unverified business regression blocks release
and returns to `tech-lead`.

## Security and SRE boundaries

The `security` agent is the AppSec owner for vulnerability inspection. It
reviews exploitable behavior and security controls, returns evidence to
`tech-lead`, and rechecks mitigations; it does not silently accept risk or
perform destructive exploitation.

The `sre-platform` agent owns environment readiness, Vercel configuration,
observability, rollback planning, and operational risk. It prepares
`environment-plan` before implementation and `operations-review` before
release. It does not publish to production, rotate secrets, or bypass gates
without the explicit approval required by the workflow.

## Handoff contract

Every delegated agent must return:

- the scope actually inspected;
- changed files, or an explicit statement that nothing changed;
- evidence and commands executed;
- decisions made and assumptions;
- remaining risks, limitations, and `NEEDS-EVIDENCE` items;
- the recommended next agent, when applicable.

## QA → orchestrator → correction flow

The `qa` agent does not fix code or create an execution report in the
repository. It returns a transient `qa-handoff` to `tech-lead` during
the same execution, containing the inventory, criteria, evidence, findings,
severity, probable owner, limitations, and `NEEDS-EVIDENCE` items.

`tech-lead` is solely responsible for deciding the next agent:

- `frontend-dev` for UI, client-side state, interaction, or presentation
  defects;
- `backend-dev` for API, persistence, contract, authorization, or server-rule
  defects;
- both when the defect crosses the frontend/backend boundary, respecting the
  contract's implementation order;
- `testing`, `security`, or `architecture` when the finding primarily concerns
  coverage, security, or ownership/architecture.

After a delegated correction, the orchestrator must request a new QA execution
before releasing the flow. A saved `qa-report` exists only when the user
explicitly requests a historical artifact; it is not a default workflow
output.

An approved gate does not replace architectural judgment. An agent must not
declare the entire repository clean based on a partial validation.

## Feedback rule

At the end of every task, the tech lead must assess whether a reusable lesson,
recurring failure, or enforcement gap emerged. When one does, it must feed the
lesson back into the narrowest normative artifact governing the case — agent
profile, skill, rule, hook, gate, or template — with the evidence and scope of
the change. Mentioning the lesson only in the final response is insufficient.

Feedback must be specific, testable when possible, and must not turn an isolated
observation into a general rule without evidence of recurrence. After editing
the harness, the agent must reread the changed section and run the applicable
validation, recording remaining limitations or `NEEDS-EVIDENCE` items.
