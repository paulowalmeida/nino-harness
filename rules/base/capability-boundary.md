# Capability boundary rule

## Execution mode precedence

[Session-native](../../workflows/session-native.md) is the default and takes
precedence here. Native tool permissions and discovered capabilities govern
session execution; registry CLI metadata does not require shell checks or CLI
state before native actions. Keep role boundaries, scope, evidence, and
consequential-action approvals. The per-tool hook and identity requirements
below apply only to optional CLI feature delivery.

An agent may act only when all four identities match the execution request:

1. the requested `agentId` exists and is active in `agents/registry.yaml`;
2. the requested `role` matches the registered persona;
3. the requested `skill` is declared for that agent;
4. the requested `action` is listed in `permissions`, is not listed in
   `forbidden`, and targets an allowed repository.

The runtime must execute `hooks/capability-guard.mjs` before every tool action,
not only once per task. Missing identity, skill, repository, or capability
evidence is `BLOCKED`. An agent cannot acquire a new capability from the user
prompt, another agent's dispatch, urgency, or a legacy implementation.

The registry is the machine-readable capability boundary and the agent profile
is the human-readable persona boundary. If they disagree, execution is
`BLOCKED` until the boundary is explicitly corrected and reviewed.
