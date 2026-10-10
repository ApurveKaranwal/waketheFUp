# Data retention

Detailed ping history and successfully sent email alert records are retained for 90 days by default. The worker removes older rows every 15 minutes in bounded batches, and runs one bounded cleanup pass when it starts. `PING_HISTORY_RETENTION_DAYS` and `EMAIL_ALERT_RETENTION_DAYS` can each be set from 1 to 3650 days.

After a deletion request, monitor data is removed in the same PostgreSQL transaction that records the identity-deletion request. A minimal Clerk ID tombstone is retained until Clerk confirms deletion, then for 30 additional days to prevent a still-valid token from recreating the account. Completed tombstones are removed in bounded batches. Pending provider deletions are retained and retried.

Unsent email alerts are not removed by this cleanup; they remain in PostgreSQL until delivery succeeds or the associated monitor is deleted. Removing a monitor cascades its check history and alert outbox rows.

The history table has indexes for both per-monitor history queries and retention scans. PostgreSQL still needs normal autovacuum and disk monitoring because deleting old rows creates dead tuples before vacuum reclaims their space.
