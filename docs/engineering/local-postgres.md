# Local Postgres Setup

This project includes a Docker Compose setup for local PostgreSQL.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

## Environment

Create a local `.env` from `.env.example`:

```bash
cp .env.example .env
```

Defaults:

- DB host: `localhost`
- DB port: `5432`
- DB name: `project_cura`
- DB user: `postgres`
- DB password: `postgres`

If `5432` is already used on your machine, set a different port before starting:

```bash
POSTGRES_PORT=5433 npm run db:up
```

If your app connects from host machine, align `DATABASE_URL` with that port.

## Commands

Start database:

```bash
npm run db:up
```

Apply migrations:

```bash
npm run db:migrate
```

Note: current SQL migrations are forward-only. If you need a clean rerun locally, use `db:reset`.

Apply seed data:

```bash
npm run db:seed
```

Check service status:

```bash
npm run db:status
```

Open psql shell:

```bash
npm run db:psql
```

Reset database (destroy volume, recreate, migrate, seed):

```bash
npm run db:reset
```

Stop database:

```bash
npm run db:down
```

Stop database and remove volume:

```bash
npm run db:down -- --volumes
```
