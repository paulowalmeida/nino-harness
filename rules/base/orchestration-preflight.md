# Orchestration preflight rule

## Execution mode precedence

[Session-native](../../workflows/session-native.md) is the default and takes
precedence here. Native discovery and work do not require this shell preflight,
a separate PO/tech-lead handoff, or CLI state. Preserve native dispatch evidence,
required repository checks, and approvals. The requirements below apply only
to optional CLI feature delivery.

The Product Owner owns business intake only. The host runtime must establish
the following state before technical work begins:

1. an approved `business-brief` exists;
2. the Product Owner invoked exactly one `tech-lead` agent;
3. the Product Owner has not performed technical inspection or repository checks;
4. every specialist action has a valid `agent-dispatch` issued by `tech-lead`.

5. every tool action passes the capability boundary in
   `hooks/capability-guard.mjs`.

The host must invoke `hooks/orchestration-preflight.mjs` before any technical
read, check, gate, browser inspection, or implementation action. A host-owned technical action is always `BLOCKED`.
It remains blocked even when the host believes the task is
read-only or urgent.

The preflight is a fail-closed boundary. Missing, malformed, stale, or
unverifiable handoff state blocks execution. The runtime may continue only by
invoking the missing `tech-lead` agent or by routing the action through a valid
specialist dispatch. It must never bypass the boundary by performing the work
directly.

The rule applies to audits, reviews, fixes, feature work, tests, deployments,
and repository discovery. Business clarification and acceptance review remain
Product Owner actions and do not authorize technical inspection.
