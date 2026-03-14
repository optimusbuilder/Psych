# Phase 2 Data Model and Persistence

This phase introduces relational persistence artifacts for core triage workflow entities.

## Delivered assets

- Migration SQL: `db/migrations/001_phase2_core_schema.sql`
- Seed SQL: `db/seeds/001_phase2_seed.sql`
- Integrity test: `src/backend/persistence/p2MigrationIntegrity.test.ts`

## Schema coverage

Core tables implemented:

- `organizations`
- `users`
- `patients`
- `respondents`
- `intake_sessions`
- `safety_assessments`
- `symptom_family_assessments`
- `functional_impairment_scores`
- `instrument_assignments`
- `instrument_results`
- `triage_decisions`
- `clinician_reviews`
- `audit_logs`

## Guardrails

- Foreign keys on all ownership links.
- One-to-one uniqueness for session-level assessment records:
  - `safety_assessments.intake_session_id`
  - `symptom_family_assessments.intake_session_id`
  - `functional_impairment_scores.intake_session_id`
- Enum-like checks for status and role fields.
- Score constraints for impairment domain values (0..10).

## Verification

Run the dedicated phase test:

```bash
npm run test:phase2
```

This validates:

1. Migration applies on empty DB.
2. Foreign keys reject invalid references.
3. Seeded data supports end-to-end relational query path:
   `intake_sessions -> safety_assessments -> triage_decisions -> clinician_reviews`.
