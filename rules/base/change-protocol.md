# Change protocol

These rules are shared by Nino projects.

- Before editing, identify scope, owner, consumers, public contract,
  dependencies, tests, and applicable gates.
- Do not infer ownership from a folder name, legacy code, alias, or visual
  similarity; inspect real consumers.
- Preserve behavior and public contracts unless explicitly authorized.
- If a defect can recur mechanically, update the rule, hook, gate, or
  regression test with the correction.
- Do not weaken or bypass a checker to make a change pass.
- Before finishing, review the final diff and separate scoped evidence, global
  validation, limitations, and human decisions.
- `NEEDS-EVIDENCE` must not be reported as `PASS`.
- Legacy code explains existing debt; it does not authorize repeating the
  pattern in new or changed code.
