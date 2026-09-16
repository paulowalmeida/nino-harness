# Nino Harness Evaluations and Observability Plan

> Goal: turn `nino-harness` from a set of governance rules into a system whose
> effectiveness can be measured, tested, and improved with evidence.

## 1. Central principle

Do not add governance blindly. Measure whether the existing governance detects,
prevents, and helps correct unsafe agent behavior.

Treat the harness as critical software: it needs tests, regressions,
observability, controlled cost, and version comparisons.

## 2. Questions to answer

- Did the agent respect architectural boundaries?
- Were required instructions and skills selected?
- Did hooks prevent invalid artifacts and explain failures?
- Did the agent claim success without evidence?
- Could indirect wording bypass a rule?
- Did a valid implementation suffer a false positive?
- How much human intervention was required?
- Did a harness change improve or regress behavior?
- Did a known failure return?

## 3. Repository adaptation

Use the smallest structure that fits the repository. The current implementation
uses:

```text
evals/
  scenarios/catalog.json
  schemas/
  assertions.mjs
  runners/eval-runner.mjs
```

Evaluation output is written to `/tmp` locally or uploaded as a CI artifact.
Operational reports are not persisted in the harness repository by default.

## 4. Scenario model

Scenarios are declarative JSON because the harness has no YAML dependency. Each
scenario contains an ID, title, category, class, optional agent/rule metadata,
and deterministic assertions. The model can later accept an agent prompt and
captured execution telemetry without changing the scenario identity.

The three required classes are:

- `happy-path`: valid behavior must not be blocked;
- `explicit-violation`: an obvious violation must be detected;
- `adversarial`: indirect or convenience wording must not bypass governance.

## 5. Initial evaluation catalog

Prioritize high-impact invariants:

1. architecture boundary protection;
2. success without evidence;
3. convenience bypasses;
4. required instruction or skill references;
5. negative hook behavior;
6. positive hook behavior and false positives;
7. authority conflicts;
8. attempts to disable governance;
9. small changes with cross-boundary impact;
10. real Nino regressions converted into permanent scenarios;
11. AppSec vulnerability boundaries;
12. SRE production-safety boundaries.

The current catalog starts with twelve deterministic scenarios. Add new scenarios
only with a reproducible invariant and a defined owner.

## 6. Deterministic hook tests

Every important hook should have independent tests for:

- valid input allowing execution;
- invalid input being rejected;
- edge cases behaving predictably;
- adversarial input not finding a bypass;
- useful diagnostics;
- deterministic exit status.

Do not use an LLM for a decision that a parser, schema, AST check, linter, or
test can make deterministically.

## 7. Source of truth

Audit duplication between profiles, rules, Skills, hooks, gates, templates,
contracts, and documentation. When the same invariant appears in multiple
places, identify one normative source and make the other references
descriptive. This reduces governance drift.

## 8. Structured telemetry

Each relevant run should produce a structured record similar to:

```json
{
  "runId": "...",
  "scenarioId": "ARCH-001",
  "agent": "...",
  "startedAt": "...",
  "rulesLoaded": [],
  "skillsInvoked": [],
  "hooksTriggered": [],
  "violationsDetected": [],
  "automaticCorrections": [],
  "humanInterventions": null,
  "verificationEvidence": [],
  "result": "pass"
}
```

Never store secrets, tokens, private data, or raw credentials. Human-agent
metrics remain `null` until real agent execution is connected; the runner must
not fabricate them.

## 9. Initial metrics

Keep the first scorecard small:

- `scenarioPassRate`: all deterministic scenarios passing;
- `detectionRate`: non-happy scenarios detected;
- `bypassRate`: adversarial scenarios that failed to protect the invariant;
- `falsePositiveRate`: happy-path scenarios blocked;
- `unsupportedSuccessRate`: unavailable until agent telemetry exists;
- `humanInterventionRate`: unavailable until agent telemetry exists;
- `selfCorrectionRate`: unavailable until agent telemetry exists.

Preserve each metric separately. Never reduce harness quality to one score.

## 10. Regression lifecycle

```text
real failure
   -> identify failure class
   -> create minimal reproducible scenario
   -> confirm the eval fails
   -> correct the harness or product owner
   -> confirm the eval passes
   -> retain the scenario permanently
```

The Balcao findings are candidates for regression scenarios when their
reproducible evidence is available, especially boundary-data and DOM/state
postconditions.

## 11. Anti-gaming

Do not make every future agent eval depend on literal known wording. Maintain
fixed regressions, parameterized variants, semantic equivalents, changed
context, and non-trivial adversarial cases. The goal is governance
generalization, not prompt memorization.

## 12. Scorecards and comparison

The runner writes `run.json` and `summary.md` to the selected output directory.
It can compare a candidate run with a previous `run.json` and report metric
deltas. With `--fail-on-regression`, lower pass/detection rates and higher
bypass/false-positive rates fail the command.

Human intervention and self-correction must remain explicitly unmeasured until
their collection path exists.

## 13. CI policy

- Pull requests run deterministic guards and evals when harness files change.
- Pushes to `main` run the same suite and upload the result as a CI artifact.
- A later scheduled job may run expensive real-agent scenarios.
- CI artifacts are retained by the CI system, not committed under
  `nino-harness/reports`.
- Expensive evaluations must not make normal development unusable.

## 14. Harness quality criteria

The harness should provide:

1. clarity;
2. deterministic enforcement;
3. explainable outcomes;
4. composable rules, Skills, hooks, and gates;
5. low duplication;
6. loud failure for important violations;
7. evidence-backed success;
8. permanent regression protection;
9. adversarial resistance;
10. controlled evaluation cost.

## 15. Implementation phases

### Phase 1 — Inventory

Map agents, authority, rules, Skills, hooks, checks, enforcement points,
duplication, and gaps. Do not change architecture while mapping.

### Phase 2 — Testable contracts

Convert critical behavior into explicit invariants and schemas.

### Phase 3 — Minimal runner

Run declarative scenarios and emit structured JSON plus a human-readable CI
summary.

### Phase 4 — Hook coverage

Add positive, negative, edge, and adversarial deterministic tests for important
hooks.

### Phase 5 — High-value scenarios

Maintain roughly 10–20 scenarios covering architecture, evidence, bypass,
security, operations, and real regressions.

### Phase 6 — Telemetry

Connect agent execution data without storing secrets or claiming unavailable
metrics.

### Phase 7 — Real regressions

Convert verified incidents into permanent scenarios with an owner and evidence.

### Phase 8 — CI

Run fast evaluations on normal changes and the broader suite for harness
changes.

### Phase 9 — Baseline

Compare repeated runs and establish a baseline before approving architectural
changes to the harness.

## 16. Operating instruction

Use this document as an engineering plan, not a blind specification. Inspect
the repository first, preserve valid decisions, reuse existing tools, avoid
unnecessary frameworks, implement incrementally, and prove each phase with
tests. Do not claim completion without verifiable evidence.

## 17. Definition of done

The first evaluation system is ready when:

- core invariants have an explicit catalog;
- important hooks have deterministic tests;
- happy, negative, and adversarial scenarios exist;
- results are structured and comparable;
- basic metrics can be calculated;
- verified incidents can become permanent regressions;
- CI uploads artifacts without adding operational reports to the repository;
- failures provide enough information to improve the harness.

At that point, the harness has an engineering feedback loop rather than only a
collection of sophisticated instructions.
