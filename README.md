# hl-budget-frontend

The HL Budget web app: Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind 4,
and `@auth0/nextjs-auth0` 4. It signs users in with Auth0, keeps the session in an encrypted
HttpOnly cookie, and calls [hl-budget-backend](https://github.com/valyalkin/hl-budget-backend) from
the server. No token ever reaches browser JavaScript.

Feature specs live in the `hl-budget-spec` repository (`specs/001-platform-foundation/`).

## Prerequisites

- Node 22 and pnpm 10 (`corepack enable`).
- The backend running locally (see its README) and the Auth0 **dev/test** tenant, with
  `http://localhost:3000/auth/callback` as an allowed callback and `http://localhost:3000` as an
  allowed logout URL and web origin.

## Run locally

```sh
cp .env.example .env.local
# fill AUTH0_* from the dev tenant, then:
echo "AUTH0_SECRET=$(openssl rand -hex 32)" >> .env.local   # and delete the placeholder line
pnpm install
pnpm dev                                                  # http://localhost:3000
```

A missing or invalid variable stops the server at startup with a message naming it (never its
value). See [`.env.example`](.env.example) for what each one is and which are secrets.

## Quality gates

```sh
pnpm typecheck && pnpm lint && pnpm test    # TypeScript strict, ESLint (+ strict a11y), Vitest
pnpm build                                  # production build
```

CI runs these, gitleaks, and a check that `app/lib/api-schema.d.ts` matches `contracts/api.yaml`.

## API types

Types are generated from the backend's contract, never written by hand:

```sh
cp ../hl-budget-backend/contracts/api.yaml contracts/api.yaml
pnpm generate:api       # writes app/lib/api-schema.d.ts; commit both files
```

## End-to-end tests (Playwright)

The specs run against a production build (`pnpm build && pnpm start`, started by Playwright) and
the Auth0 dev/test tenant's seeded user. Credentials come from your shell, never from a file in
Git:

```sh
pnpm exec playwright install chromium     # once
# backend running on :8080, .env.local filled in
export E2E_USERNAME=test-user@example.com E2E_PASSWORD='…'
set -a; . ./.env.local; set +a
pnpm e2e
```

Without `E2E_USERNAME`/`E2E_PASSWORD` the sign-in journeys skip and only the signed-out checks
run. The API-down case additionally needs a second server whose `API_BASE_URL` points at a closed
port, its origin in `E2E_DOWN_BASE_URL`, and that origin allowed as a callback in the tenant.

## Container

`Dockerfile` builds the `output: 'standalone'` server and runs `node server.js` as UID 10001 on a
read-only root filesystem. Port 8080; writable directories `/tmp` and `/app/.next/cache`;
`/healthz` and `/readyz` answer `{"status":"UP"}`.
