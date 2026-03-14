# Project Cura: Child & Adolescent Psychiatry Triage

This repo contains the frontend prototype for a shared triage platform with two entry points:
- Patient/Caregiver Intake App
- Hospital/Provider Dashboard

Target architecture: both entry points call one deterministic clinical triage engine (rules-first), with clinician override and audit logging.

## Tech Stack (Current)
- Vite
- React + TypeScript
- Tailwind CSS + shadcn-ui
- Vitest + Playwright (test tooling available)

## Local Setup
```bash
npm install
npm run dev
```

## Local Database (Postgres)
```bash
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
```

Reference: `docs/engineering/local-postgres.md`

## Run Backend API (Phase 3)
```bash
npm run api:start
```

Frontend Phase 8 integration uses live `/api/v1/*` endpoints. In local development:
- run backend on `http://localhost:4000`
- run frontend on `http://localhost:8080` (Vite proxy forwards `/api` to backend)

## Delivery Plan by Phase

Each phase has:
- Scope: what we build
- Success test: objective pass/fail criteria

### Phase 1: Foundation and Project Structure
Scope:
- Define backend service structure (API layer, triage orchestration, rules, review, instruments)
- Add environment configuration strategy (`.env.example`)
- Establish linting/testing conventions and CI baseline

Success test:
- Test name: `P1-Foundation-Smoke`
- Method:
1. Fresh clone installs with `npm install`
2. Frontend starts with `npm run dev`
3. Test suite runs with `npm test`
- Pass criteria:
1. No install/runtime errors
2. All baseline tests pass
3. CI pipeline is green on main branch

### Phase 2: Data Model and Persistence
Scope:
- Implement relational schema for core entities:
  - users, organizations, patients, respondents
  - intake_sessions, safety_assessments, symptom_family_assessments
  - functional_impairment_scores, instrument_assignments, instrument_results
  - triage_decisions, clinician_reviews, audit_logs
- Add migrations and seed data

Success test:
- Test name: `P2-DB-Migration-Integrity`
- Method:
1. Run migrations on empty database
2. Seed sample cases
3. Query critical relations (session -> safety -> decision -> review)
- Pass criteria:
1. Migrations apply without manual fixes
2. Foreign keys and constraints enforce valid relationships
3. Seeded sample can be read end-to-end from one query path

### Phase 3: Intake Session API
Scope:
- Build session lifecycle APIs:
  - create intake session
  - save each step
  - resume in-progress session
  - submit completed intake
- Add request validation and role-aware access

Success test:
- Test name: `P3-Intake-Session-E2E`
- Method:
1. Create session via API
2. Save respondent, safety, symptoms, functional impact in separate requests
3. Resume session and verify state continuity
4. Submit session and verify status transition
- Pass criteria:
1. No data loss across step-by-step saves
2. Session resumes exactly at latest saved state
3. Final status changes to submitted/awaiting-triage

### Phase 4: Safety Service (Universal First Gate)
Scope:
- Implement safety evaluation as mandatory first logic
- Positive safety flags create urgent review case
- Normal routing is suspended when safety-positive

Success test:
- Test name: `P4-Safety-Override-Rule`
- Method:
1. Submit intake with at least one positive safety criterion
2. Attempt normal routing call
3. Check provider urgent queue and audit log
- Pass criteria:
1. Case is marked urgent
2. Normal auto-routing does not continue
3. Urgent event is logged with timestamp and rule reason

### Phase 5: Deterministic Clinical Rules Engine
Scope:
- Implement rules for:
  - age band classification
  - respondent/rater logic
  - symptom family selection
  - severity by highest functional impairment
  - mixed/unclear routing to clinician review
- Version all rule sets

Success test:
- Test name: `P5-Rules-Fixture-Matrix`
- Method:
1. Run a fixture matrix covering age bands, symptom families, and severity tiers
2. Validate engine outputs against expected outcomes
- Pass criteria:
1. 100% fixture match for expected pathway/review requirement
2. Engine returns deterministic output for repeated same input
3. Rule version is attached to every triage decision

### Phase 6: Instrument Routing and Scoring
Scope:
- Assign instruments by age + symptom family + severity
- Support completion state and scoring/cutoff interpretation
- Feed results back into triage decision context

Success test:
- Test name: `P6-Instrument-Routing-Accuracy`
- Method:
1. Create representative cases (anxiety, mood, ADHD, developmental, substance)
2. Trigger assignment logic
3. Submit mock results near and above cutoff
- Pass criteria:
1. Assigned instruments match protocol mapping for each case
2. Cutoff triggers are interpreted correctly
3. Instrument result state transitions are valid (`assigned -> completed -> scored`)

### Phase 7: Provider Review Workflow
Scope:
- Build review queue, urgent queue, case detail, and override action
- Record rationale for clinician override
- Finalize disposition workflow

Success test:
- Test name: `P7-Clinician-Override-Audit`
- Method:
1. Pull flagged case into review queue
2. Apply override with rationale
3. Finalize disposition
4. Re-open case history
- Pass criteria:
1. Override updates final disposition correctly
2. Rationale is required and persisted
3. Full action chain appears in audit logs

### Phase 8: Patient/Provider Frontend Integration
Scope:
- Replace mock data with live APIs
- Wire intake steps to save/resume/submit endpoints
- Wire provider pages to real queues and case detail endpoints

Success test:
- Test name: `P8-Frontend-Live-Flow`
- Method:
1. Complete intake from UI
2. Verify case appears in provider dashboard
3. Open case detail and review generated recommendation
- Pass criteria:
1. No mock data dependency for primary flow
2. New intake appears in provider list within expected latency
3. Case detail matches submitted data and engine output

### Phase 9: Security, Compliance, and Release Readiness
Scope:
- Enforce RBAC by role and organization
- Add audit coverage for sensitive actions
- Harden API validation, rate limits, and error handling
- Finalize deployment and monitoring checklist

Success test:
- Test name: `P9-Security-Release-Gate`
- Method:
1. Run role-based negative tests (unauthorized access attempts)
2. Verify audit entries for review/override/disposition
3. Run production build and smoke checks
- Pass criteria:
1. Unauthorized actions are denied with correct status codes
2. Sensitive actions are always auditable
3. Production deployment passes smoke tests with no critical errors

## Definition of MVP Complete
MVP is complete when Phases 1 through 8 pass all success tests, with Phase 9 minimum gate items:
- RBAC enforced for provider actions
- Audit logging for safety flags and clinician overrides
- Production smoke test passing

## Notes on AI Usage
- AI can support summarization, plain-language explanations, and structured extraction.
- AI must not make final safety or disposition decisions.
- Deterministic rules engine remains the source of truth for triage routing.
