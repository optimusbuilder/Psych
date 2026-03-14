# Phase 6 Instrument Routing and Scoring

This phase adds deterministic instrument assignment, completion/scoring workflows, and result feedback into triage decision context.

## What was implemented

- Instrument routing + scoring service:
  - `src/backend/instruments/service.ts`
- Repository support for instrument lifecycle:
  - `routeInstruments(sessionId)`
  - `listInstrumentAssignments(sessionId)`
  - `completeInstrumentAssignment(assignmentId)`
  - `scoreInstrumentAssignment(assignmentId, input)`
- API endpoints:
  - `GET /api/v1/intake-sessions/:id/instrument-assignments`
  - `POST /api/v1/intake-sessions/:id/instruments/route`
  - `POST /api/v1/instrument-assignments/:assignmentId/complete`
  - `POST /api/v1/instrument-assignments/:assignmentId/score`

## Routing rules summary

1. Assign a broad screener by age band.
2. Add targeted instruments by normalized symptom family.
3. Include higher-risk targeted screeners (for example `ASQ`) when severity warrants it.
4. Dedupe assignments by `instrument_name + assigned_to`.

## Scoring behavior summary

1. Valid state transition enforced: `assigned -> completed -> scored`.
2. Instrument-specific cutoffs determine `cutoff_triggered`.
3. On positive cutoff, a new `triage_decisions` row is inserted using `instrument-v1.0.0`.
4. Positive cutoff can elevate session state to `awaiting_review` (unless already `flagged_urgent`).

## Verification

Run:

```bash
npm run test:phase6
```

`P6-Instrument-Routing-Accuracy` validates:

1. Assignment mapping for anxiety, mood, ADHD, developmental, and substance-use cases.
2. Cutoff interpretation for near-threshold and above-threshold scores.
3. Assignment status transitions and decision-context update on cutoff trigger.
