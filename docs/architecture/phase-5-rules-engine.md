# Phase 5 Deterministic Rules Engine

This phase introduces a deterministic clinical rules engine and persists its output as triage decisions at submit time.

## What was implemented

- Rules engine:
  - `src/backend/rules/engine.ts`
- Decision persistence on submit:
  - `src/backend/intake/repository.ts`
  - `submitSession` now evaluates rules, inserts into `triage_decisions`, and sets session status from engine output.
- Decision payload now includes:
  - recommendation
  - review requirement
  - urgency
  - engine version
  - pathway key and reason codes (response only)

## Rules behavior summary

1. Safety-positive inputs always trigger `immediate_urgent_review`.
2. Age band and respondent model are deterministic from DOB.
3. Mixed/unclear cases require clinician review.
4. Highest functional impairment determines severity tier.
5. Pathway and urgency are deterministic from safety + symptom family + severity.
6. Every persisted triage decision carries `engine_version`.

## Verification

Run:

```bash
npm run test:phase5
```

`P5-Rules-Fixture-Matrix` validates:

1. Fixture matrix outputs across age/symptom/severity combinations.
2. Deterministic repeatability for identical inputs.
3. Engine version persistence on every submitted triage decision row.
