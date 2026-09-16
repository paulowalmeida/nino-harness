# Harness evaluations

This directory contains deterministic evaluations for the Nino harness. The
current runner checks enforceable harness behavior; it does not claim to run
an LLM or measure model behavior until an authorized agent runner is added.

## Running locally

```bash
npm run evals:run
```

Local output is written to `/tmp/nino-harness-evals/<run-id>` by default. Use
`--output-dir <directory>` to choose another location, or `--baseline <run.json>`
to compare metrics with a previous run. Add `--fail-on-regression` to fail when
the candidate's detection or pass rate decreases, or its bypass or false-
positive rate increases.

## Scenario classes

- `happy-path`: valid behavior must not be blocked;
- `explicit-violation`: an obvious violation must be detected;
- `adversarial`: indirect or convenience wording must not bypass governance.

Every scenario is declarative and uses deterministic assertions. Human-agent
telemetry fields remain `null` until a real agent execution is connected; the
runner never invents intervention or self-correction metrics.

The initial catalog contains twelve high-value scenarios covering architecture,
evidence, governance, skills, language, security, operations, and regressions.

CI uploads `run.json` and `summary.md` as artifacts. They are not persisted in
the repository's operational report directory.
