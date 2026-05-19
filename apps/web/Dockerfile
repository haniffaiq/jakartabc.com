# syntax=docker/dockerfile:1.7

# ---- Stage 1: deps ----
FROM node:20.18.0-alpine AS deps
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
FROM node:20.18.0-alpine AS builder
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

# Build-time env (next build imports src/env.ts which zod-validates)
ARG DATABASE_URL
ARG PAYLOAD_SECRET
ARG NEXT_PUBLIC_SITE_URL
ARG DEFAULT_LOCALE=en
ARG REVALIDATE_SECRET
ARG EMAIL_PROVIDER=resend
ARG RESEND_API_KEY
ARG EMAIL_FROM
ARG SALES_EMAIL
ARG TURNSTILE_SECRET_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV DATABASE_URL=$DATABASE_URL \
    PAYLOAD_SECRET=$PAYLOAD_SECRET \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    DEFAULT_LOCALE=$DEFAULT_LOCALE \
    REVALIDATE_SECRET=$REVALIDATE_SECRET \
    EMAIL_PROVIDER=$EMAIL_PROVIDER \
    RESEND_API_KEY=$RESEND_API_KEY \
    EMAIL_FROM=$EMAIL_FROM \
    SALES_EMAIL=$SALES_EMAIL \
    TURNSTILE_SECRET_KEY=$TURNSTILE_SECRET_KEY \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    PAYLOAD_FORCE_PUSH=true

# NODE_ENV=development bypasses drizzle's prod-mode skip on pushDevSchema.
# This is acceptable for a build-time, one-shot schema sync. Switch to
# `payload migrate` once apps/web/src/migrations/* is generated and committed.
RUN NODE_ENV=development pnpm --filter @jakartabc/web exec tsx scripts/db-push.ts
RUN pnpm --filter @jakartabc/web build

# ---- Stage 3: runtime ----
FROM node:20.18.0-alpine AS runner
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
