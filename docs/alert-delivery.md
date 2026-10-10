# Email alerts

WTFup records notification events in PostgreSQL in the same transaction as the monitor state and check history. A background worker sends pending events through SMTP and retries failures. Events are deduplicated by monitor, incident number, and event type.

## Notification behavior

- A confirmation is queued when a monitor is created.
- A down alert is queued after three consecutive failed checks. HTTP 2xx responses count as healthy; other statuses, timeouts, DNS failures, and connection errors count as failed checks.
- One recovery alert is queued after the first healthy check for an open incident.
- Email is sent to the primary email address associated with the signed-in account at event time.

SMTP must be configured in the backend environment:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM="WTFup Monitoring <alerts@example.com>"
```

Use the SMTP provider's documented port and TLS settings. Configure SPF, DKIM, and DMARC for the sender domain with your provider before sending production mail. Keep credentials in the deployment's secret store; never commit them.

The dispatcher checks the durable outbox every 15 seconds, queues up to 100 due events per pass, and retries SMTP failures with exponential backoff. Failed events stay in PostgreSQL and are eligible for later dispatch, including after a process restart. SMTP is an at-least-once delivery channel: if the provider accepts a message but the process loses the acknowledgement before saving `sentAt`, the same event can be delivered again.

## Database migration

For a new database, run:

```sh
bun install
bun run db:migrate:deploy
```

For an existing database created with the earlier `db:push` workflow, take a backup first. The initial migration describes the pre-alert schema so it can be recorded as the baseline, then the alert migration adds the new fields and outbox table:

```sh
bun x prisma migrate resolve --applied 20261010120000_initial --schema=backend/prisma/schema.prisma
bun run db:migrate:deploy
```

Only baseline a database whose `User`, `Project`, and `PingHistory` tables match that initial migration. If the schema differs, stop and create a migration for the actual schema before deploying; do not run the baseline command blindly.
