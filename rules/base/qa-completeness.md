# QA Completeness Rule

This rule is mandatory for every QA validation.

1. The QA agent must discover the testable product surface before execution.
2. The discovered surface must be recorded as an inventory and converted into
   a coverage matrix.
3. Every matrix item must have an explicit result and evidence reference.
4. Missing requirements, undocumented behavior and inaccessible environments
   must be reported; they cannot be treated as passing behavior.
5. `PASS` is forbidden when any applicable flow is untested, any defect is
   unresolved, or any limitation prevents a reliable conclusion.
6. QA must never claim that all flows were validated based only on a green
   build, lint run or automated test suite.
7. QA is read-only with respect to product source, tests and configuration.
8. A critical flow must validate boundary data, not only visible progression;
   UI validation alone cannot prove that the intended payload or persisted
   state exists.
9. Remote mutations require action-time authorization, synthetic isolation
   and a recorded cleanup decision or retained resource ID.
10. A lifecycle action outside the authorized scope must not be executed just
    because it is the next available UI action.

The only valid final states are `PASS`, `FAIL`, `BLOCKED` and
`NEEDS-EVIDENCE`.
