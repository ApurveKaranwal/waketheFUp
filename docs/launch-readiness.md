# Launch readiness

This is the launch handoff checklist for the current repository. A passing CI run confirms code checks; it does not prove the live service is configured or ready to accept users.

## Implemented in the repository

- Clerk bearer-token verification and account-scoped monitor access.
- Public HTTP(S) URL validation, DNS rebinding protection, pinned outbound IPs, no redirect following, and bounded checks.
- Per-account API limits, request-size limits, and a configurable monitor quota.
- Durable monitor history and incident email outbox, retry scheduling, and recovery notifications.
- Worker schedule reconciliation, split API/worker processes, readiness/liveness routes, and bounded data retention.
- PostgreSQL migrations, Bun lockfiles, CI checks, setup instructions, contributing/security policies, and an operations runbook.
- Dashboard monitor creation, editing, pause/resume, deletion, recent history, and search.
- Self-service account deletion with transactional local-data removal, a retryable Clerk deletion outbox, and short-lived identity tombstones.

## Required before a public production launch

- **License and repository:** confirm the MIT license and copyright attribution, set the public repository URL, and enable private vulnerability reporting.
- **Identity and domains:** configure production Clerk keys, verified email and sign-in providers, allowed origins/redirect URLs, DNS, HTTPS, and the correct frontend/API URLs.
- **Infrastructure:** provision production PostgreSQL, Redis, frontend, API, and worker services. Restrict network access and store secrets in the provider's secret manager.
- **Email:** configure a production SMTP provider, sender verification, SPF/DKIM/DMARC, bounce/complaint handling, and test down/recovery delivery to real inboxes.
- **Data rights and policy:** publish an accurate privacy policy, terms, support contact, and acceptable-use policy. Verify the account-deletion flow in staging, including local monitor/history/alert removal and successful provider deletion/retry.
- **Recovery and observability:** configure managed PostgreSQL backups, complete a restore rehearsal, and add external uptime checks and alerts for the API, worker, queue delays, database, Redis, and email delivery.
- **Live acceptance:** run migrations against the target database, verify health checks, and exercise signup, monitor CRUD, cross-account access denial, a down/recovery incident, service restarts, and a failed SMTP retry against staging.
- **Capacity and abuse:** decide an initial supported account/monitor volume, verify worker capacity and provider spending limits, and configure edge/IP abuse protection for account creation and API traffic.

## Deployment boundary

No production services, credentials, domain, or deployment target are configured in this workspace. The repository is prepared for deployment, but a public launch cannot be verified until the required providers and launch choices above are supplied and staging acceptance passes.
