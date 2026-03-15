# Project Cura

Project Cura is a rules-first child and adolescent psychiatry triage platform. It combines:

- A Vite React intake + provider dashboard (`/` and `/provider`) 
- A Next.js family referral experience (`new_frontend/`)
- An Express backend with deterministic triage logic
- PostgreSQL persistence, migrations, and seed data

The goal is clinically safe routing first, with provider override and auditable workflows.

## What This Repo Contains

- `src/`: Vite frontend + backend services + test suites
- `new_frontend/`: Next.js family referral frontend
- `db/`: SQL migrations and seed data
- `scripts/`: local DB and full-stack dev scripts
- `docs/`: architecture, clinical, and engineering notes

## System Overview

1. Intake data is collected from caregiver/patient workflows.
2. Safety screening runs first and can suspend normal routing.
3. Deterministic rules engine assigns urgency/pathway.
4. Instrument routing/scoring and clinician review complete triage.
5. Family referral flow supports question-spec + PDF + optional AI explanation.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (recommended for local Postgres)

## Quick Start

```bash
npm install
npm --prefix new_frontend install
cp .env.example .env
npm run dev:all
```

Services started by `dev:all`:

- Backend API: `http://localhost:4000`
- Vite app: `http://localhost:8080`
- Next app: `http://localhost:3000`

If your database is already up:

```bash
SKIP_DB_BOOT=1 npm run dev:all
```

For a full DB reset + reseed:

```bash
DB_BOOT_MODE=reset npm run dev:all
```

## Environment Variables

Core variables from `.env.example`:

| Variable | Purpose |
| --- | --- |
| `API_PORT` | Backend port (default `4000`) |
| `DATABASE_URL` | Postgres connection string |
| `POSTGRES_*` | Local container DB bootstrap |
| `VITE_API_BASE_URL` | Vite API base (empty uses Vite proxy) |
| `VITE_PROVIDER_USER_ID` | Provider dashboard user context |
| `DEFAULT_ORGANIZATION_ID` | Default org for seeded/demo flows |
| `TRIAGE_ENGINE_VERSION` | Rules engine version stamp |
| `LLM_SUMMARY_MODEL` | Model label used in summary layer config |

Next frontend variable:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL used by `new_frontend/lib/api.ts` |

Optional AI explanation support:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables model-generated family referral explanation |

## Development Commands

### Root (`package.json`)

```bash
npm run dev            # Vite frontend
npm run api:start      # Express backend only
npm run dev:all        # DB + backend + Vite + Next
npm run lint           # ESLint
npm test               # Vitest suite
npm run build          # Vite production build
npm run check          # lint + test + build
```

### Next frontend (`new_frontend/package.json`)

```bash
npm --prefix new_frontend run dev
npm --prefix new_frontend run lint
npm --prefix new_frontend run build
npm --prefix new_frontend run start
```

## Database Operations

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run db:status
npm run db:psql
npm run db:reset
npm run db:down
```

Reference: `docs/engineering/local-postgres.md`

## API Surface (Summary)

### Health

- `GET /api/v1/health`

### Family referral

- `GET /api/v1/family-referrals/question-spec`
- `POST /api/v1/family-referrals`
- `GET /api/v1/family-referrals/:id`
- `GET /api/v1/family-referrals/:id/pdf`
- `POST /api/v1/family-referrals/:id/ai-explain`

### Intake session lifecycle

- `POST /api/v1/intake-sessions`
- `PATCH /api/v1/intake-sessions/:id/respondent`
- `PATCH /api/v1/intake-sessions/:id/safety`
- `PATCH /api/v1/intake-sessions/:id/symptoms`
- `PATCH /api/v1/intake-sessions/:id/functional-impact`
- `POST /api/v1/intake-sessions/:id/submit`
- `GET /api/v1/intake-sessions/:id`
- `GET /api/v1/intake-sessions/:id/audit`

### Instruments

- `GET /api/v1/intake-sessions/:id/instrument-assignments`
- `POST /api/v1/intake-sessions/:id/instruments/route`
- `POST /api/v1/instrument-assignments/:assignmentId/complete`
- `POST /api/v1/instrument-assignments/:assignmentId/score`

### Provider workflow

- `GET /api/v1/provider/review-queue`
- `GET /api/v1/provider/urgent-cases`
- `GET /api/v1/provider/cases/:id`
- `POST /api/v1/provider/cases/:id/override`

## Auth and Request Headers

Backend endpoints are role-gated through headers:

- `x-role`: one of `patient`, `caregiver`, `intake_coordinator`, `clinician`, `admin`
- `x-user-id`: required for provider endpoints

## Testing

Run all tests:

```bash
npm test
```

Run phase suites:

```bash
npm run test:phase2
npm run test:phase3
npm run test:phase4
npm run test:phase5
npm run test:phase6
npm run test:phase7
npm run test:phase8
npm run test:phase9
npm run test:family
```

Quality gates reference: `docs/engineering/quality-gates.md`

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build`

on pushes to `main` and `codex/**`, and on pull requests.

## Architecture and Clinical Docs

- Foundation: `docs/architecture/phase-1-foundation.md`
- Data model: `docs/architecture/phase-2-data-model.md`
- Intake API: `docs/architecture/phase-3-intake-api.md`
- Safety: `docs/architecture/phase-4-safety-service.md`
- Rules engine: `docs/architecture/phase-5-rules-engine.md`
- Instrument routing: `docs/architecture/phase-6-instrument-routing-scoring.md`
- Provider review: `docs/architecture/phase-7-provider-review-workflow.md`
- Frontend integration: `docs/architecture/phase-8-frontend-live-flow.md`
- Security readiness: `docs/architecture/phase-9-security-release-readiness.md`
- Family referral API: `docs/architecture/hackathon-family-backend-api.md`

## Troubleshooting

- If `dev:all` fails at DB boot, ensure Docker Desktop is running.
- If Next build fails while fetching Google Fonts, retry with internet access enabled.
- If provider views return `403`, verify `x-role`/`x-user-id` map to a seeded provider user.
- If migrations appear already applied, use `DB_BOOT_MODE=reset npm run dev:all`.

## License

MIT. See `LICENSE`.
