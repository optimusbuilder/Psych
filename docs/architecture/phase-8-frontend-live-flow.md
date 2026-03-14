# Phase 8 Frontend Live Flow Integration

This phase replaces provider-side mock dependencies with live API calls and wires the intake flow to real backend persistence endpoints.

## What was implemented

- Frontend API client:
  - `src/lib/api.ts`
- Intake page live wiring:
  - `src/pages/IntakePage.tsx`
  - creates session, saves respondent/safety/symptoms/functional impact, and submits
  - recommendation screen now consumes live decision payload
- Provider pages live wiring:
  - `src/pages/ProviderDashboard.tsx`
  - `src/pages/ProviderCases.tsx`
  - `src/pages/ProviderUrgent.tsx`
  - `src/pages/ProviderCaseDetail.tsx`
  - case detail supports live clinician override submission
- Dev API proxy:
  - `vite.config.ts` routes `/api` to backend `http://localhost:4000`

## Behavior summary

1. Intake flow persists step-by-step to backend and transitions to recommendation from submitted decision output.
2. Provider dashboard and queues read from live provider endpoints.
3. Case detail reads full backend case context and supports override/finalize actions.
4. Provider views no longer depend on `mockCases` for primary workflow.

## Verification

Run:

```bash
npm run test:phase8
```

`P8-Frontend-Live-Flow` validates:

1. Intake progression and submission through frontend UI with live API path.
2. Submitted case appears on provider cases view.
3. Provider case detail reflects submitted patient data and backend recommendation output.
