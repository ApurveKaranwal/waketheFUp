# API limits

The API applies a 16 KiB request-body limit and a Redis-backed fixed-window limit to authenticated monitor routes. Default per-account limits are 120 GET requests, 10 monitor creations, 30 PATCH requests, and 10 deletions per minute. If Redis cannot enforce a limit, the API returns `503` rather than processing an unprotected request. Exceeded limits return `429` with `Retry-After` and rate-limit headers.

Accounts may have up to 10 monitors by default. `MAX_MONITORS_PER_USER` can raise or lower this value and must be a positive integer. Monitor creation serializes quota checks on the account row so concurrent requests cannot exceed the limit.

These limits protect authenticated application operations. Put an edge proxy or WAF in front of the API to add IP-based limits to unauthenticated traffic and protect against volumetric attacks before requests reach Bun.
