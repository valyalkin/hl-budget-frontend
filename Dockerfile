# syntax=docker/dockerfile:1
# hl-budget-frontend for the homelab (research R-015), from the homelab Dockerfile.node template
# adapted to pnpm and Next's `output: 'standalone'`. Base image pinned by version and digest.
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# app/lib/env.ts validates at module load, and `next build` loads it. These are placeholders for
# the build only, set on this one command so they never reach an image layer's ENV. The real
# values (and secrets) arrive at runtime from the chart and Vault.
RUN APP_BASE_URL=http://build.invalid \
    API_BASE_URL=http://build.invalid \
    AUTH0_DOMAIN=build.invalid \
    AUTH0_CLIENT_ID=build-placeholder \
    AUTH0_CLIENT_SECRET=build-placeholder \
    AUTH0_SECRET=build-placeholder \
    AUTH0_AUDIENCE=build-placeholder \
    NEXT_TELEMETRY_DISABLED=1 \
    pnpm build

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914
ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Read-only root filesystem: /tmp and /app/.next/cache are the writable tmpDirs.
USER 10001:10001
EXPOSE 8080
# node directly (no pnpm wrapper), so SIGTERM reaches the server.
CMD ["node", "server.js"]
