# Phase 4 Safety Service

This phase enforces safety-first triage behavior and urgent escalation controls.

## What was implemented

- Deterministic safety evaluation service:
  - `src/backend/safety/service.ts`
- Safety assessment now:
  - computes escalation + reason codes
  - updates session status to `flagged_urgent` when positive
  - writes `safety_flagged` event into `audit_logs`
- Safety-first gate enforced:
  - symptom routing and functional impact endpoints now require completed safety screen
  - positive safety case blocks normal auto-routing with `409 AutoRoutingSuspended`
- Provider visibility endpoints:
  - `GET /api/v1/provider/urgent-cases`
  - `GET /api/v1/intake-sessions/:id/audit` (provider roles)

## Behavior summary

1. Positive safety response immediately marks case urgent.
2. Case enters urgent queue (`status = flagged_urgent`).
3. Domain routing is suspended until clinician review.
4. Audit event captures escalation level and reason codes.

## Verification

Run:

```bash
npm run test:phase4
```

`P4-Safety-Override-Rule` validates:

1. Safety-positive intake is flagged urgent.
2. Normal routing call is blocked.
3. Urgent queue contains the case and audit logs contain `safety_flagged`.
