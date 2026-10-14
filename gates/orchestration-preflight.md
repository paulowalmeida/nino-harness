# Orchestration preflight gate

This gate runs before technical work in a feature-delivery execution.

Required evidence:

- an approved `business-brief`;
- a `tech-lead` agent invocation by `product-owner`;
- no host-owned technical action before dispatch;
- a valid `agent-dispatch` for every specialist action;
- `BLOCKED` when the runtime cannot evaluate the handoff state.

The deterministic checker is:

```bash
npm run harness:orchestration:preflight -- \
  --manifest /path/to/orchestration-state.json \
  --actor specialist \
  --action specialist-technical-inspection
```

The host must not replace `specialist` with itself. A host technical action
must fail closed:

```bash
npm run harness:orchestration:preflight -- \
  --manifest /path/to/orchestration-state.json \
  --actor host \
  --action host-technical-inspection
```

The hook is a protocol boundary for the orchestration runtime. Static harness
checks prove that the boundary exists; the runtime remains responsible for
calling it before tool execution and preserving the manifest for the run.
