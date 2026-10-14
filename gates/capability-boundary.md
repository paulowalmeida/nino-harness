# Capability boundary gate

Run this gate before every agent tool action:

```bash
npm run harness:capability -- \
  --agent backend-dev \
  --role implementer \
  --action edit-source \
  --skill nestjs \
  --repository nino-api
```

The gate blocks when the action is absent from the agent permissions, present
in the forbidden list, outside the repository scope, or outside the declared
skills and persona. The runtime must pass the exact agent identity and must
not substitute the host identity.

Capability checks are fail-closed and must be repeated after every handoff or
role transition. A valid delegation does not grant capabilities that the
target agent does not already possess.
