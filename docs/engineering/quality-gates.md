# Quality Gates

Phase 1 baseline checks:

1. `npm run lint`
2. `npm test`
3. `npm run build`

CI runs all three checks on:
- pull requests
- pushes to `main`
- pushes to `codex/**`

## Local workflow

Run all checks in sequence:

```bash
npm run check
```

## PR checklist

1. New code includes tests for behavior changes.
2. Rule changes include version changes and fixture updates.
3. No patient-facing safety behavior is changed without explicit review.
