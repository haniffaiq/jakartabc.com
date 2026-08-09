# syntax=docker/dockerfile:1.7

# ---- Stage 1: deps ----
FROM node:20.18.1-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/config/package.json packages/config/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/content/package.json packages/content/package.json
COPY packages/email/package.json packages/email/package.json
COPY apps/web/package.json apps/web/package.json

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Stage 2: build ----
FROM node:20.18.1-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /repo/packages/content/node_modules ./packages/content/node_modules
COPY --from=deps /repo/packages/email/node_modules ./packages/email/node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Public values are compiled into the client bundle.
ARG NEXT_PUBLIC_SITE_URL
ARG DEFAULT_LOCALE=en
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY

# next build imports src/env.ts. These deterministic values only satisfy
# validation; real runtime configuration arrives through the container env.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    PAYLOAD_SECRET=build-only-payload-secret-not-for-runtime \
    REDIS_URL=redis://127.0.0.1:6379 \
    REDIS_KEY_PREFIX=jakartabc:build \
    MINIO_ENDPOINT=http://127.0.0.1:9000 \
    MINIO_REGION=us-east-1 \
    MINIO_BUCKET=jakartabc-build \
    MINIO_ACCESS_KEY=build-only-minio-access-key \
    MINIO_SECRET_KEY=build-only-minio-secret-key \
    MINIO_PUBLIC_URL=http://127.0.0.1:9000/jakartabc-build \
    MINIO_FORCE_PATH_STYLE=true \
    TRUSTED_PROXY_SECRET=build-only-proxy-secret-not-for-runtime \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    DEFAULT_LOCALE=$DEFAULT_LOCALE \
    REVALIDATE_SECRET=build-only-revalidation-secret \
    EMAIL_PROVIDER=resend \
    RESEND_API_KEY=build-only-resend-key \
    EMAIL_FROM=build@example.invalid \
    SALES_EMAIL=build@example.invalid \
    TURNSTILE_SECRET_KEY=build-only-turnstile-secret \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Build does not connect to DB — DATABASE_URL only needs to pass zod
# format validation. Schema is applied at runtime by the `web-migrate`
# init container (see docker-compose.yml) which runs `payload migrate`.
RUN pnpm --filter @jakartabc/web build

# ---- Stage 3: runtime ----
FROM node:20.18.1-alpine AS runner
RUN apk add --no-cache libc6-compat tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

# Persistent volumes
RUN mkdir -p /uploads && chown nextjs:nodejs /uploads
VOLUME ["/uploads"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
