# Contributing

Thanks for helping improve WTFup. Keep changes focused on a user problem and explain the behavior change in the pull request.

## Before opening a pull request

- Install Bun `1.3.14`, PostgreSQL, and Redis as described in the [setup guide](README.md).
- For API, queue, schema, or monitor-check changes, run `bun run test`, `bun x prisma validate --schema=backend/prisma/schema.prisma`, and `node frontend/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`.
- For frontend changes, run `bun --cwd frontend lint` and `bun --cwd frontend build`.
- Add or update focused tests for behavior changes. Do not use a production database for local checks.
- Include migration SQL for schema changes. Do not use `prisma db push` for a deployed database.

## Project boundaries

- PostgreSQL is the source of truth for accounts, monitors, check history, and pending email alerts.
- Redis/BullMQ schedules checks and runs background delivery. Worker startup reconciles monitor schedules from PostgreSQL.
- API monitor routes must use the authenticated account ID for every read and write.
- Monitor URL validation and pinned outbound connections are security-sensitive. Keep SSRF protections intact and add tests for new URL cases.
- Do not commit `.env` files, secrets, generated dependency directories, or local database dumps.

## Pull request description

Describe the problem, the user-visible change, the migration or configuration impact, and the checks you ran. Call out any deployment step that operators must perform.
