# API and worker processes

The PostgreSQL monitor records are the source of truth for scheduled checks. The API writes the monitor change first and then attempts to update BullMQ. If Redis is temporarily unavailable, the API reports that the schedule is pending while the monitor change remains saved.

When a worker starts, it reconciles enabled monitors into BullMQ and removes stale project schedules. A recurring reconciliation runs once per minute to repair missed updates and schedules left behind after deletion. The worker rechecks that a monitor still exists and is enabled before each request.

The ping worker runs up to 20 checks concurrently per worker process. Each endpoint check has a 10-second request timeout and resolves the destination before connecting, so the HTTP/TLS connection uses only the public IP addresses that were validated for that check.

The email worker dispatches durable email alerts and processes queued Clerk account deletions. Monitor `/health/ready` for worker heartbeats; a stale or missing heartbeat means the API should not receive traffic.

For local development, `bun run backend` starts the API and workers together. For deployment, run the services separately:

```sh
bun run backend:api
bun run backend:worker
```

Both processes need the same PostgreSQL and Redis settings. BullMQ requires Redis 5 or later; Redis 7 is used in CI. Scale the worker independently from the API. Do not run the worker command without a supported Redis version and PostgreSQL available; it performs a full schedule reconciliation before accepting jobs.
