# Nino Agent Harness

This project is the shared governance layer for Nino agents. It coordinates
work across `nino-api`, `nino-app`, and `nino-docs`; repository-specific rules
remain mandatory.

## Loading order

Before acting, the agent must:

1. identify the repository and the task's actual scope;
2. read the corresponding adapter under `adapters/`;
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

`tech-lead` is the technical lead for delivery and is read-only by
default. It investigates, plans, classifies dependencies, routes work, and
prepares handoffs. It does not decide product priorities or business rules,
change code, or start implementation without explicit authorization or an
already approved workflow.

## Product Owner rule

The `product-owner` agent owns the business intake: user intent, priority,
scope, acceptance criteria, and critical business journeys. It hands an
approved `business-brief` to `tech-lead`, which converts it into the technical
work order and routes specialized agents.

The `product-owner` must always perform business regression after the final
technical QA/correction loop and before release. This validates acceptance
criteria and critical journeys from the user's perspective; it does not
replace QA's functional, integration, security, accessibility, or technical
regression checks. A failed or unverified business regression blocks release
and returns to `tech-lead`.

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
