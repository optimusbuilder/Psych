# Phase 7 Provider Review Workflow

This phase adds the provider review queue, detailed case view, and clinician override/final disposition workflow with auditable history.

## What was implemented

- Provider review queue and case detail support in repository:
  - `listReviewQueue(status, limit)`
  - `getProviderCaseDetail(sessionId)`
  - `listClinicianReviewsForSession(sessionId)`
- Clinician override + disposition finalization in repository:
  - `applyClinicianReview(sessionId, input, actorUserId)`
  - persists `clinician_reviews` record
  - appends final decision snapshot to `triage_decisions`
  - optionally marks session `completed`
  - writes audit actions to `audit_logs`
- Provider API endpoints:
  - `GET /api/v1/provider/review-queue`
  - `GET /api/v1/provider/cases/:id`
  - `POST /api/v1/provider/cases/:id/override`

## Workflow behavior

1. Review queue lists cases in `awaiting_review` and/or `flagged_urgent`.
2. Provider opens case detail to see aggregate intake, latest decision, assignments/results, reviews, and audit trail.
3. Clinician submits override/final disposition with required rationale.
4. Session can be finalized to `completed`.
5. Actions are auditable (`clinician_review_recorded`, `override_applied`, `disposition_finalized`).

## Verification

Run:

```bash
npm run test:phase7
```

`P7-Clinician-Override-Audit` validates:

1. Flagged review case appears in provider queue.
2. Override requires rationale and persists final disposition.
3. Case history includes clinician review details after finalization.
4. Audit trail contains the full provider action chain.
