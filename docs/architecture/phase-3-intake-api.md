# Phase 3 Intake Session API

This phase adds API endpoints for the intake session lifecycle with validation and role-aware access.

## Implemented endpoints

- `POST /api/v1/intake-sessions`
- `PATCH /api/v1/intake-sessions/:id/respondent`
- `PATCH /api/v1/intake-sessions/:id/safety`
- `PATCH /api/v1/intake-sessions/:id/symptoms`
- `PATCH /api/v1/intake-sessions/:id/functional-impact`
- `GET /api/v1/intake-sessions/:id`
- `POST /api/v1/intake-sessions/:id/submit`
- `GET /api/v1/health`

## Validation and access control

- Request body validation uses `zod` schemas in `src/backend/intake/contracts.ts`.
- Role-aware middleware (`x-role`) is enforced in `src/backend/api/auth.ts`.
- Write endpoints allow:
  - `patient`, `caregiver`, `intake_coordinator`, `admin`
- Read endpoint allows:
  - `patient`, `caregiver`, `intake_coordinator`, `clinician`, `admin`

## Session lifecycle behavior

1. `create` inserts patient + intake session.
2. Step saves upsert respondent, safety, symptoms, and functional impact.
3. `resume` returns aggregate session state from relational tables.
4. `submit` verifies required sections and transitions status:
   - `flagged_urgent` if immediate safety review required
   - `awaiting_review` if mixed/unclear or severe impact
   - `awaiting_instruments` otherwise

## Verification

Run:

```bash
npm run test:phase3
```

Test `P3-Intake-Session-E2E` validates:

1. Session creation.
2. Step-by-step save operations.
3. Resume with persisted data.
4. Submit status transition with no data loss.
