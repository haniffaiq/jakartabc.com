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
COPY apps/portal/package.json apps/portal/package.json

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
COPY --from=deps /repo/apps/portal/node_modules ./apps/portal/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG DATABASE_URL
ARG PAYLOAD_SECRET
ARG PORTAL_COOKIE_DOMAIN
ARG NEXT_PUBLIC_PORTAL_URL
ENV DATABASE_URL=$DATABASE_URL \
    PAYLOAD_SECRET=$PAYLOAD_SECRET \
    PORTAL_COOKIE_DOMAIN=$PORTAL_COOKIE_DOMAIN \
    NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL

RUN mkdir -p apps/portal/public
RUN pnpm --filter @jakartabc/portal build

# ---- Stage 3: runtime ----
FROM node:20.18.1-alpine AS runner
RUN apk add --no-cache libc6-compat tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/portal/public ./apps/portal/public

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3001/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/portal/server.js"]
