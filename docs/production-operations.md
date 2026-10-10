# Production operations

## Release procedure

1. Run CI and review the migration SQL before release.
2. Take or verify a recent PostgreSQL backup and confirm a restore has been tested.
3. Deploy the application revision to the frontend, API, and worker services. Configure production secrets in the hosting provider, not in Git.
4. Run `bun run db:migrate:deploy` once as a release step using the new revision and production `DATABASE_URL`. Do not run migrations independently from every API or worker replica.
5. Start or roll the API and worker. The worker rebuilds scheduled monitor checks from PostgreSQL on startup; the alert outbox remains in PostgreSQL and is retried after restart.
6. Check `/health/live` and `/health/ready`, then create a temporary monitor and verify a successful check, a down alert, and a recovery alert before announcing the release.

Run the API and worker as separate supervised services with restart-on-failure. Set `PORT` to the port supplied by the host. Use TLS-enabled PostgreSQL and Redis URLs where supported, and restrict database and Redis network access to the app services. Set frontend and API origins explicitly; production readiness rejects non-HTTPS browser origins.

## Backup and restore

Use the managed PostgreSQL provider's automated backups or point-in-time recovery, and set a retention period that meets the service's recovery needs. Test restoring a backup into a separate database before launch and periodically afterward. A backup that has never been restored is unverified.

For self-managed PostgreSQL, a custom-format backup can be made with:

```sh
pg_dump --format=custom --no-owner --file=wtfup-backup.dump "$DATABASE_URL"
```

Restore into a fresh, isolated database first:

```sh
createdb wtfup_restore_check
pg_restore --no-owner --dbname=wtfup_restore_check wtfup-backup.dump
```

Validate the restored account, monitor, history, and alert data before considering the backup usable. Never test a restore against the live database. Protect backup files as sensitive user data and encrypt them at rest and in transit.

Redis contains BullMQ scheduling state, but the PostgreSQL monitor rows are authoritative and project schedules are reconstructed when the worker starts. Keep Redis available and persistent according to the chosen provider's recommendations; a Redis loss can delay checks and emails until workers recover. The PostgreSQL alert outbox preserves unsent notifications across that outage.

## Signals to monitor

- Alert on repeated API/worker restarts, `/health/ready` failures, missed monitor checks, and repeated email delivery failures.
- Track PostgreSQL disk usage, connection saturation, backup age, and restore-test age.
- Track Redis memory, availability, and evictions. Avoid eviction policies that remove BullMQ keys.
- Review SMTP provider delivery, bounce, and complaint metrics. Configure SPF, DKIM, and DMARC for the sender domain.
- Keep application logs access-controlled and retain them according to your privacy policy. Do not log authorization headers, SMTP credentials, or full request bodies.

## Recovery

If API readiness fails, inspect the database/Redis checks and deployment environment before restarting. If worker checks fail, verify the worker process and shared Redis/PostgreSQL configuration. If notifications fail, inspect the email worker logs and SMTP provider; pending alert rows are retried from PostgreSQL. Account deletion removes local data immediately; pending Clerk identity deletions retry from PostgreSQL. If a release migration fails, stop rollout, preserve the database, and follow the migration's rollback or forward-fix plan. Do not manually edit `_prisma_migrations` to bypass a failed migration.
