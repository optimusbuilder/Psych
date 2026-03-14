# Phase 9 Security, Compliance, and Release Readiness

This phase adds the minimum security and release gate controls required to treat the triage workflow as provider-supervised and auditable.

## What was implemented

- Provider identity enforcement on provider/audit endpoints:
  - requires valid provider role header (`x-role`)
  - requires `x-user-id` mapped to a real user record
  - role header must match the persisted user role
- Organization boundary checks:
  - provider case detail, override, and audit endpoints deny cross-organization access
  - provider queue/urgent list are organization-scoped for org-linked patients
- API hardening:
  - in-memory request rate limiter for `/api/v1/*`
  - centralized structured internal error response middleware
- Frontend provider API compatibility:
  - provider requests now include `x-user-id` (configurable with `VITE_PROVIDER_USER_ID`)

## Verification

Run:

```bash
npm run test:phase9
```

`P9-Security-Release-Gate` validates:

1. Unauthorized provider actions are denied (`401`/`403`).
2. Cross-organization access to org-linked sessions is blocked.
3. Review/override/disposition actions are auditable.
4. Rate limiting triggers `429` while health smoke remains available.

## Release checklist (MVP)

1. `npm run check` passes (lint, tests, production build).
2. Provider seed users exist for each tenant organization.
3. `VITE_PROVIDER_USER_ID` is configured for local provider dashboard demos.
4. API health endpoint responds `200` before frontend rollout.
