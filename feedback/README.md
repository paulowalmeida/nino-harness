# Feedback lifecycle

Feedback is external memory for the agents. It does not retrain model
weights; it improves future behavior only when the evidence is deliberately
fed into the next run or promoted into the harness.

## Ephemeral feedback

Raw evaluations, screenshots, logs and run-specific observations belong in a
temporary run directory outside this repository, for example:

```text
/tmp/nino-harness-feedback/<run-id>/
```

The next iteration consumes that directory as context. After the report and
next iteration are complete, discard it with:

```bash
node hooks/feedback-lifecycle.mjs discard /tmp/nino-harness-feedback/<run-id>
```

The discard command accepts only directories below the configured temporary
feedback root.

## Retained feedback

Only approved, reusable lessons belong in `feedback/retained/`. Each retained
record must follow `contracts/feedback-record.schema.json`, cite evidence and
identify the exact rule, Skill, hook, gate, documentation or regression test
that protects it.

Retained feedback is loaded selectively by repository, agent role and scope.
The full history must not be injected into every prompt.

## Promotion boundary

The `learning-curator` classifies feedback as recurring/mechanical,
domain-specific, judgment-only or noise. It may prepare a promotion proposal,
but it cannot promote a lesson without explicit human approval. A lesson that
is not reusable is discarded after the current iteration and does not alter
agent instructions.
