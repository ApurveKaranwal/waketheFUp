# WTFup

WTFup is an open source uptime monitoring app. Users create monitors for HTTP(S) endpoints, receive scheduled availability checks, review recent check history, get email notifications when an endpoint goes down or recovers, and delete their account and monitoring data from settings.

The app has a Next.js frontend and a Bun/Hono API. PostgreSQL stores accounts, monitors, check history, and a durable alert outbox. Redis and BullMQ schedule checks and deliver alerts. Clerk provides authentication.

## Current status

WTFup is under active development. The repository contains the core monitor, scheduled-check, incident-notification, and history flows. A production deployment still needs configured infrastructure and credentials, verified provider-managed backup/restore, operational monitoring, and a verified deployment process. Do not treat a successful local build as a production launch sign-off.

## Requirements

- Bun (use the version pinned by the repository's CI setup)
- PostgreSQL
- Redis
- A Clerk application
- An SMTP account for monitor alerts

## Local setup

1. Install root and frontend dependencies:

   ```sh
   bun install --frozen-lockfile
   bun --cwd frontend install --frozen-lockfile
   ```

2. Copy `backend/.env.example` to the repository root as `.env` and fill in PostgreSQL, Redis, Clerk, and SMTP values. Bun and Prisma load this root environment file when the commands below run from the repository root. Keep secrets out of source control. Set `CORS_ORIGINS` to the frontend origin used in development.

3. Apply migrations to a new local database:

   ```sh
   bun run db:migrate:deploy
   ```

   For a database previously created with `db:push`, read the baseline instructions in [docs/alert-delivery.md](docs/alert-delivery.md) before recording the initial migration as applied.

4. Start the API and background workers together:

   ```sh
   bun run backend
   ```

5. In another terminal, copy `frontend/.env.example` to `frontend/.env.local`, fill in the Clerk keys and API URL, then start Next.js:

   ```sh
   bun --cwd frontend dev
   ```

The API listens on port `4000` by default and the frontend on port `3000`. The frontend environment variable names are documented in [frontend/README.md](frontend/README.md).

## Production processes

Run the API and worker as separate long-running services:

```sh
bun run backend:api
bun run backend:worker
bun --cwd frontend start
```

Build the frontend with its production `NEXT_PUBLIC_*` values before starting it. The API and worker need the same PostgreSQL, Redis, Clerk, and SMTP configuration. Configure an HTTPS frontend origin in `CORS_ORIGINS` and the resource limits described in [docs/api-limits.md](docs/api-limits.md). The API exposes `/health/live` for process liveness and `/health/ready` for dependency and worker readiness.

Read [docs/worker-operations.md](docs/worker-operations.md), [docs/data-retention.md](docs/data-retention.md), [docs/alert-delivery.md](docs/alert-delivery.md), the [production operations runbook](docs/production-operations.md), and the [launch readiness checklist](docs/launch-readiness.md) before operating a deployment.

## Development checks

```sh
bun run test
bun x prisma validate --schema=backend/prisma/schema.prisma
bun --cwd frontend lint
bun --cwd frontend build
```

## Roadmap & Future Features

Review the planned growth milestones, multi-channel alerting (Discord, Slack, Webhooks), public status pages, multi-region probes, and enterprise features in [ROADMAP.md](ROADMAP.md).

## Contributing and security

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues using the private process in [SECURITY.md](SECURITY.md). Review the MIT license attribution and configure a monitored security contact before public launch.
