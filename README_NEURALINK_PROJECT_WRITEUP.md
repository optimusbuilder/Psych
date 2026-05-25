# Neuralink Project Writeup Notes

## SECTION A — REPO-BASED PROJECT ANALYSIS

- **Problem**
  This repo solves a non-trivial intake and triage problem for child/adolescent psychiatry: how to collect incomplete, noisy caregiver/patient input, route obvious safety-critical cases immediately, keep normal cases moving through structured screening, and still preserve clinician override, audit history, and organization-level access control. The key engineering challenge is not form collection; it is enforcing the correct order of operations so unsafe or ambiguous cases do not silently fall through a normal routing path.

- **Architecture**
  The system is a full-stack triage platform with two separate frontends feeding a shared backend core:
  `src/pages/*` is a Vite/React intake + provider dashboard, `new_frontend/*` is a Next.js family referral flow, `src/backend/api/createApp.ts` exposes 23 REST endpoints, and Postgres persists workflow state across 17 tables (`db/migrations/001_phase2_core_schema.sql`, `db/migrations/002_family_referral_mvp.sql`). The backend is explicitly decomposed into 6 service domains in `src/backend/foundation/platformTopology.ts`: API gateway, triage orchestration, safety screening, clinical rules, instrument routing, and clinical review. That decomposition is not just documentation theater; the runtime code reflects the same sequencing.

- **Core Technical Components**
  `src/backend/safety/service.ts` performs the first-pass safety evaluation and classifies cases into `none`, `urgent`, or `immediate`, with reason codes and an `autoRoutingSuspended` flag.
  `src/backend/rules/engine.ts` is the deterministic triage core. It normalizes symptom families, derives respondent model and age band, computes severity from four functional domains, calculates a bounded 0-100 acuity score with explicit multipliers, and maps to pathway, urgency, specialty track, and review requirement.
  `src/backend/intake/repository.ts` is the real orchestration layer. It wraps state transitions in transactions, persists decisions with engine versions, updates session status, creates audit rows, routes instruments idempotently, and lets later evidence mutate downstream disposition.
  `src/backend/instruments/service.ts` handles a second-stage screening pipeline across 14 supported instruments. `scoreInstrumentAssignment()` in the repository enforces state transitions (`assigned -> completed -> scored`) and can insert a new triage decision plus move the session back to `awaiting_review` if a cutoff is crossed.
  `src/backend/api/createApp.ts` enforces role gating, organization scoping, and rate limiting before requests even reach the repository. Provider endpoints require both valid role and `x-user-id`, and detail/audit/override endpoints are additionally filtered by organization membership.
  The family referral path is not a toy sidecar. `src/backend/family/questionSpec.ts` defines an 82-question runtime spec, `src/backend/family/questionnaireRouting.ts` compiles questionnaire answers into the same deterministic rules input used elsewhere, and `src/backend/family/repository.ts` persists the original intake JSON plus a decision snapshot and PDF report metadata.

- **Key Data Flow**
  1. Intake session is created with patient identity and route type.
  2. Respondent metadata and communication profile are saved.
  3. Safety screening runs first; if positive, session status becomes `flagged_urgent`, audit events are written, and symptom/functional routing endpoints return `409 AutoRoutingSuspended`.
  4. If safety is clear, symptom family scores and functional impact scores are saved.
  5. Submission evaluates deterministic rules, persists a triage decision with engine version, and moves the session into `awaiting_instruments`, `awaiting_review`, or `flagged_urgent`.
  6. Instrument routing assigns targeted screens; later scoring can escalate urgency and reopen clinician review.
  7. Providers consume review queues and urgent queues, inspect full case detail, and apply an audited override/final disposition.

- **Hard Parts**
  The hardest part is explicit control-flow correctness under partial information. `submitSession()` conditionally requires different fields depending on whether safety was positive; urgent cases intentionally bypass normal symptom/functional completion checks, while non-urgent cases must supply them.
  A second hard part is keeping deterministic routing stable while allowing downstream evidence to change the outcome. The repo handles that by versioning decisions instead of mutating them in place; later instrument cutoffs and clinician overrides append new decision rows.
  A third hard part is reuse: the family questionnaire mode and the provider/patient intake mode both converge on the same rule engine rather than duplicating routing logic in separate flows.

- **Failure Modes / Tradeoffs**
  Safety-positive cases deliberately short-circuit the normal pipeline. That reduces throughput but is the correct tradeoff for a clinically sensitive system.
  AI is intentionally kept out of the critical path. `src/backend/ai/service.ts` is used only for extraction/summarization/flagging, and `submitSession()` wraps it in best-effort `try/catch`; deterministic rules remain the source of truth. That is a strong design decision for correctness.
  The API rate limiter in `src/backend/api/createApp.ts` is in-memory, so it is fine for single-process deployments and tests but not sufficient as a distributed production control.
  Auth is header-based in current code (`x-role`, `x-user-id`) rather than a real JWT verification path, even though JWT env vars exist in `.env.example`; that means security architecture is partially scaffolded rather than fully implemented.
  The repo has quality signals but also visible gaps: `npm run build` passes, `npm run lint` passes with 17 Fast Refresh warnings, and `npm test` passes 29/31 tests. The two current failures are meaningful: one stale migration test still expects a removed `respondents` table, and one intake resume test expects a `respondent` field that no longer matches the aggregate shape returned by the backend.

- **What Most Non-Technical Readers Would Miss**
  The impressive part is not “there is an AI triage app.” The impressive part is that the system treats triage as a stateful, failure-prone workflow with explicit suspension points, recoverable partial progress, auditable clinician intervention, and multiple intake modalities converging on one deterministic decision engine.
  A casual reader would also miss that later evidence can reopen review. That is a systems design detail that matters in operational software: the system is not just classifying once; it is handling evolving evidence over time.

- **Why This Project Is Impressive From an Engineering Standpoint**
  It shows cross-stack ownership: React/Vite intake UI, Next.js family flow, Express API, Postgres schema/migrations/seeds, local infra scripts, CI, and a meaningful automated test suite.
  It shows systems thinking: 6 explicitly modeled backend domains, 23 endpoints, 17 persisted tables, 14 instrument types, 82 questionnaire nodes, and a workflow that moves across safety gate -> deterministic routing -> instrument routing -> provider review -> override audit.
  It shows reliability-oriented thinking: transaction boundaries around state transitions, idempotent instrument routing, audit log creation on sensitive actions, org-scoped provider access, rate limiting, and deliberate avoidance of AI in the decision-critical path.
  It is more than a demo because the repo encodes operational concerns directly in implementation and tests, not just in docs.

## SECTION B — EVIDENCE TABLE

| Claim | Evidence from repo | Confidence level |
| --- | --- | --- |
| This project is an end-to-end triage platform, not just a frontend prototype. | Two frontends (`src/pages/*`, `new_frontend/*`), Express backend (`src/backend/api/createApp.ts`), Postgres schema/migrations (`db/migrations/*.sql`), DB scripts (`scripts/db/*.sh`), and CI (`.github/workflows/ci.yml`). | High |
| The architecture is intentionally decomposed into service domains. | `src/backend/foundation/platformTopology.ts` defines 6 required modules and validates dependency wiring; `platformTopology.test.ts` enforces it. | High |
| Safety handling is first-class and can suspend normal routing. | `saveSafety()` updates session status to `flagged_urgent`, writes `safety_screen_completed`, `auto_routing_suspended`, and `safety_flagged` audit rows; symptom/functional endpoints reject unsafe sessions with `409` in `src/backend/api/createApp.ts`. | High |
| The core routing logic is deterministic rather than AI-driven. | `evaluateTriageRules()` in `src/backend/rules/engine.ts` computes age band, severity, acuity score, pathway, urgency, and reason codes from typed inputs. `src/backend/ai/service.ts` explicitly states AI is only for extraction/summarization/flagging. | High |
| The system supports evolving evidence instead of one-shot classification. | `scoreInstrumentAssignment()` can insert a new triage decision and move the session back to `awaiting_review` when an instrument cutoff is triggered. | High |
| Provider actions are scoped by organization and audited. | `resolveProviderActorContext()` plus `requireSessionOrganizationAccess` in `src/backend/api/createApp.ts`; `applyClinicianReview()` writes review rows, new decision rows, and audit events. Security behavior is covered in `src/backend/security/p9SecurityReleaseGate.test.ts`. | High |
| The same decision core is reused across multiple intake modes. | `createFamilyRoutingOutputFromSubmission()` routes legacy family intake and questionnaire intake into the same rules core; questionnaire answers are compiled in `src/backend/family/questionnaireRouting.ts`. | High |
| The family flow is more than a static survey. | `src/backend/family/questionSpec.ts` defines 82 runtime questions; `src/backend/family/repository.ts` persists intake JSON and decision snapshot; `/pdf` and `/ai-explain` endpoints produce artifacts. | High |
| The repo has meaningful automated verification, including integration tests. | 12 test files / 31 test cases were counted from `src/backend/**/*.test.ts`, `src/frontend/**/*.test.tsx`, and `src/test/**/*.test.ts`; `src/frontend/p8FrontendLiveFlow.test.tsx` exercises intake -> provider list -> provider case detail. | High |
| The project exhibits real engineering tradeoffs rather than pretending to be fully production hardened. | In-memory rate limiter in `createApp.ts`; header-based auth rather than full JWT verification; AI wrapped as best-effort; current verification results show 29/31 tests passing, one passing build, and lint warnings. | High |
| The repo demonstrates rapid learning across unfamiliar tooling. | The implementation spans Vite, Next.js, Express, Postgres, pg-mem, Vitest, Playwright config, Docker Compose, and Gemini integration in one codebase. This is an inference from breadth, not a directly logged fact. | Medium |
| This codebase is closer to workflow automation / infra-adjacent systems work than to a typical CRUD app. | Session states, audit events, transactional writes, idempotent routing, org scoping, queue endpoints, and explicit failure codes (`401/403/404/409/429`) are built into the core flow. | High |

## SECTION C — 3 VERSIONS OF THE FINAL APPLICATION WRITEUP

### Version 1: Maximum technical strength

- **Built** a rules-first psychiatric triage platform that spans 2 separate frontends, a typed Express API with 23 endpoints, and a 17-table Postgres schema, then forced every intake through an explicit safety-first control flow before any downstream routing. I implemented a deterministic triage engine that normalizes symptom families, computes age/communication/severity/acuity, routes 14 follow-up instruments, and preserves versioned decision history so later evidence can reopen clinician review instead of silently mutating prior state. The system also enforces org-scoped provider access, rate limiting, and audit logging for safety screens and clinician overrides, and the repo backs the workflow with 31 automated tests, including end-to-end frontend/backend flow coverage. Most importantly, AI is deliberately kept out of the decision-critical path and used only as optional summarization/explanation with graceful fallback, which is the kind of reliability tradeoff I would make in any high-stakes system.

### Version 2: Best balance

- **Designed** and built a full-stack mental-health triage system that routes patients from intake to provider review across React/Vite, Next.js, Express, and Postgres, with 23 API endpoints and 17 persisted tables. The core backend is a deterministic rules engine, not an LLM wrapper: it runs safety gating first, computes severity and acuity from structured inputs, assigns 14 targeted screening instruments, and records auditable clinician overrides and organization-scoped access decisions. I also reused that same routing core across two different intake surfaces, including an 82-question family questionnaire, which shows the project was built as a coherent system rather than a collection of demos.

### Version 3: Most concise

- **Built** a rules-first psychiatric triage platform with 2 frontends, a 23-endpoint Express API, and a 17-table Postgres backend, centered on a deterministic engine that safety-gates cases, computes acuity, routes 14 follow-up instruments, and escalates provider review when new evidence crosses a cutoff. I treated it like an operational system instead of a demo by adding org-scoped access control, audit logs, versioned decisions, and automated coverage across 31 tests, while keeping AI strictly optional and outside the decision-critical path.

## SECTION D — INTERVIEW DEFENSE

- **5 tough follow-up questions an interviewer could ask**
  1. Why did you choose deterministic rules as the primary decision path instead of putting an LLM in the loop for routing?
  2. Walk me through the exact state transitions for a safety-positive intake and explain what prevents normal routing from continuing.
  3. How does the system handle new evidence from instrument scoring after an initial decision has already been made?
  4. What are the weakest parts of the current architecture if this had to support multiple backend instances or real provider traffic?
  5. Your tests are not fully green today. Which failures are contract drift vs. real product risk, and how would you fix them first?

- **Specific code / architecture areas you must understand to defend the writeup honestly**
  `src/backend/rules/engine.ts`
  You need to understand how age band, respondent model, symptom normalization, severity, acuity multipliers, and pathway selection actually work, especially the safety override and mixed/unclear fallback paths.

  `src/backend/safety/service.ts` and `src/backend/intake/repository.ts`
  You need to be able to explain why safety is evaluated before symptom routing, how `saveSafety()` updates session status and audit logs, and why urgent cases can be submitted without the same downstream fields as non-urgent cases.

  `src/backend/intake/repository.ts`
  You should know `submitSession()`, `routeInstruments()`, `scoreInstrumentAssignment()`, and `applyClinicianReview()` in detail, because that is where the system stops looking like CRUD and starts looking like workflow orchestration.

  `src/backend/api/createApp.ts`
  You need to understand role gating, provider identity checks, organization scoping, rate limiting, and the exact use of `409` conflicts to block invalid state transitions.

  `src/backend/family/questionnaireRouting.ts`, `src/backend/family/repository.ts`, and `src/backend/family/questionSpec.ts`
  You should be ready to explain how the 82-question family flow is converted into the same rules input as the main intake flow, and why that reuse matters architecturally.

  `src/frontend/p8FrontendLiveFlow.test.tsx`
  This is the strongest proof that the UI is wired into the backend rather than mocked in isolation. Be ready to talk through what it actually verifies and what it does not.

  **Verification facts worth remembering**
  `npm run build` passed locally.
  `npm run lint` passed with 17 warnings, all Fast Refresh related.
  `npm test` passed 29/31 tests.
  The current failures are:
  `src/backend/persistence/p2MigrationIntegrity.test.ts` still expects a `respondents` table that no longer exists.
  `src/backend/intake/p3IntakeSessionE2E.test.ts` expects `resumeResponse.body.respondent`, but the current aggregate shape returns `referringProvider` instead.

## Bottom Line

If Neuralink engineers drilled into this repo for 20 minutes, the most respectable part is not the UI and not the AI integration. It is the fact that the project treats a clinically sensitive workflow like a real system: deterministic control logic, explicit failure states, auditable overrides, evolving evidence, shared core logic across multiple entry points, and enough tests to reveal both the strengths and the remaining contract drift honestly.
