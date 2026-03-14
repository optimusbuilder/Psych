# Phase 1 Foundation

This phase establishes the baseline architecture and quality gates for a shared triage platform.

## Backend module topology (rules-first design)

Planned backend structure:

```text
src/backend
  foundation/
    types.ts
    platformTopology.ts
  modules/
    apiGateway.module.ts
    triageOrchestration.module.ts
    safetyScreening.module.ts
    clinicalRules.module.ts
    instrumentRouting.module.ts
    clinicalReview.module.ts
```

## Module responsibilities

- `api-gateway`: auth, request validation, session context, audit context
- `triage-orchestration`: controls workflow order and branching across intake nodes
- `safety-screening`: mandatory first gate and escalation trigger
- `clinical-rules`: deterministic routing logic (age/symptom/severity/review requirement)
- `instrument-routing`: assigns protocol instruments and captures scoring states
- `clinical-review`: queue management and clinician override/disposition handling

## Dependency intent

- `triage-orchestration` depends on:
  - `safety-screening`
  - `clinical-rules`
  - `instrument-routing`
  - `clinical-review`
- `instrument-routing` depends on:
  - `clinical-rules`
- Other modules are independent at this stage.

## Why this shape

- Keeps clinical decision logic deterministic and isolated.
- Keeps orchestration separate from rule implementation.
- Leaves room to split into services later without changing core contracts.
