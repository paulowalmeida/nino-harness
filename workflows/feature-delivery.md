# Feature delivery workflow

Standard workflow for a feature crossing product, API, application, and
documentation.

```text
Product Owner
    ↓
Business brief / decisions
    ↓
Architecture and contracts
    ├── Backend implementation
    └── Frontend implementation → UX review when user-facing
            ↓
    Security + Testing + QA
            ↓
    Documentation
            ↓
    Release gate
```

## Fases

1. **Product intake:** define business objective, users, priority, scope,
   acceptance criteria, and critical regression journeys.
2. **Technical brief:** the tech lead converts the business brief into a
   technical work order.
3. **Evidence:** map current code, consumers, contracts, and limitations.
4. **Architecture:** define ownership, dependencies, states, integration, and
   compatibility.
5. **Contract:** approve payloads, responses, states, and events before
   parallelizing implementation.
6. **Surface discovery:** QA maps routes, screens, modules, endpoints, roles,
   states, and related flows before implementation.
7. **Implementation:** delegate to the correct repositories and agents using
   the discovered inventory.
8. **UX review:** inspect interaction and accessibility for user-facing
   changes; mark it not applicable with evidence for backend-only work.
9. **Adversarial review:** test errors, repetition, concurrency, permissions,
   invalid data, and recovery when applicable.
10. **QA loop:** validate acceptance criteria and real flows with reproducible
   evidence. Route each failure, limit correction to three iterations, and
   return to QA after every correction.
11. **Business regression:** the Product Owner replays every acceptance
    criterion and critical journey. Failure blocks release.
12. **Documentation:** update contracts, operations, and relevant decisions.
13. **Release:** execute scoped and global gates, separate unrelated failures,
    and review the final diff.

No phase may declare PASS without the evidence required by the repository that
owns the code.
