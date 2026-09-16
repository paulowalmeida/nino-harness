# Harness Gate

The harness gate validates the governance repository itself. Run:

```bash
npm run harness:guard
```

The gate passes only when all hooks pass:

- `registry-guard`: agent IDs, roles, statuses, permissions and outputs are
  structurally valid;
- `reference-guard`: active profiles, adapters, workflows and agent references
  resolve; planned profiles are reported as warnings;
- `profile-guard`: profiles have valid frontmatter, mission and completion
  instructions;
- `contract-guard`: work-order and workflow contracts preserve their required
  structure;
- `secret-guard`: no supported credential pattern is present in tracked files.
- `feedback-guard`: retained learning is approved, evidenced and structurally
  valid; ephemeral feedback is not allowed in the versioned repository.

The gate checks harness integrity; it does not replace the product-specific
hooks and gates in `nino-api`, `nino-app` or `nino-docs`.
