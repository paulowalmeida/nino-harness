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
- `architecture`, `testing`, `security`, `ux-ui`, `documentation`, and
  `release`: active specialist profiles.

The structured workflow is in `workflows/feature-delivery.yaml`. The
`agents/registry.yaml` file is a capability and permission catalog; it does not
launch agents by itself. An orchestration runtime may be added later when the
contracts are exercised by a real feature.

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
