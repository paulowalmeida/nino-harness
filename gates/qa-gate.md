# QA Gate

The QA gate is a final checkpoint for functional validation. It passes only
when all conditions below are true:

- an approved work order and acceptance criteria exist;
- a surface inventory covers routes, screens, modules, endpoints, roles and
  relevant state transitions;
- the inventory has a coverage matrix;
- every applicable acceptance criterion and matrix item has evidence;
- no reproducible `FAIL` remains without an approved decision;
- no `BLOCKED` or `NEEDS-EVIDENCE` item is being presented as `PASS`;
- critical cross-layer fields have payload/state postcondition evidence, or
  are explicitly marked `NEEDS-EVIDENCE`;
- every remote mutation has an authorization record, synthetic scope and
  cleanup or an explicitly retained resource identifier;
- the QA handoff identifies limitations and untested areas explicitly.

The default QA output is transient and is consumed by `tech-lead`.
Saving a report under `nino-harness/reports` requires an explicit user request.

The QA gate does not authorize production changes. The release gate remains
responsible for final repository checks and human approval of production
actions.
