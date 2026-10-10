# WTFup frontend

The web app uses Next.js, React, Tailwind CSS, and Clerk authentication. Start at the repository root and follow the [main setup guide](../README.md).

Create `frontend/.env.local` for local development:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_SECRET_KEY=sk_test_replace_me
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`NEXT_PUBLIC_API_URL` is the URL of the Hono API. In production, set it to the public HTTPS API origin and set the API's `CORS_ORIGINS` to the frontend HTTPS origin. Only the Clerk publishable key and API URL belong in `NEXT_PUBLIC_` variables; never expose the Clerk secret key in a browser variable.

Useful commands, run from the repository root:

```sh
bun install --cwd frontend --frozen-lockfile
bun --cwd frontend dev
bun --cwd frontend lint
bun --cwd frontend build
```
