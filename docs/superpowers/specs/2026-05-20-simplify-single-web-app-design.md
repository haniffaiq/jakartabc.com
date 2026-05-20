# Design: simplify deployment to a single web app

Date: 2026-05-20

## Goal

Collapse the deployment from seven moving parts (web, portal, nginx, certbot,
web-migrate, bundled postgres, two compose files + a bootstrap script) down to
**one application container** (`web`) plus an external Postgres. The user's
actual need is: a marketing website, a CMS, a database, and an API backend —
all of which already live inside the `web` app.

## Why

The current stack is over-built for the requirement. Each removed part is
either redundant or replaceable:

- **portal** — a second Next.js app with its own Payload instance whose only
  collection (`users`) is byte-for-byte identical to the `users` collection
  already in `web`'s Payload, pointed at the same database. Pure duplication.
- **nginx + certbot + init-letsencrypt.sh + docker-compose.tls.yml** — TLS
  termination + ACME. Replaced by putting Cloudflare in front; the origin then
  speaks plain HTTP.
- **web-migrate** — a separate init container. Folded into the `web`
  container's startup.
- **bundled postgres + `bundled-db` profile** — unused; the database is an
  external Postgres on the server host.

## End state

```
Cloudflare ──HTTP──> [ web container ]
                          │  Next.js (App Router) + Payload CMS (one instance)
                          │   /[locale]        marketing website
                          │   /admin           CMS admin UI
                          │   /api/*           Payload REST/GraphQL + custom API
                          │   /login /dashboard  (former portal)
                          │  entrypoint: payload migrate -> next start
                          ▼
                   Postgres (server host, external)
```

`docker-compose.yml` contains a single service: `web`.

## Decisions (locked)

- Portal is **folded into `web`** as routes, not kept and not split out.
- TLS is handled by **Cloudflare** in front; the origin serves plain HTTP.
- Database stays an **external Postgres on the server host**, reached via
  `host.docker.internal` (compose `extra_hosts: host-gateway`).
- Schema migration is **folded into the `web` container startup**
  (`payload migrate` then serve).
- Delivered as **one spec, one phased plan** (Phase 1 merge, Phase 2 infra).

## Phase 1 — merge portal into web

`apps/portal` is thin: login + dashboard UI, an auth library, an auth
middleware, and a redundant Payload config.

**Move into `apps/web/src/`:**
- `app/login/page.tsx`, `app/dashboard/page.tsx` — as **root-level routes**,
  outside the `[locale]` segment (siblings of the `(payload)` group), so they
  are not localized. Mirrors how portal served them un-prefixed.
- `components/LoginFormWired.tsx`, `components/LogoutButton.tsx`.
- `lib/auth.ts` — the login/session helper.

**Middleware:** `apps/web/src/middleware.ts` currently runs only
`next-intl`. Merge in portal's guard: requests to `/dashboard/*` without the
session cookie redirect to `/login?next=...`. The combined middleware runs the
auth guard for `/dashboard/*` and `next-intl` for the localized site; the
`matcher` is widened to include `/dashboard/:path*` while still excluding
`admin`, `api`, `_next`, and asset paths.

**Payload:** no collection work — `web`'s Payload already defines the
identical `users` collection (auth, `role` select of admin/editor/client).
The former-portal auth flow talks to that same Payload instance.

**Auth cookie:** the portal session cookie (`jbc_portal_session`) and its
login/logout flow are carried over unchanged — only the hosting app changes.

**Delete `apps/portal/` entirely** and remove it from `pnpm-workspace.yaml`
and `turbo.json`.

**Drop env vars:** `PORTAL_PAYLOAD_SECRET`, `PORTAL_COOKIE_DOMAIN`,
`NEXT_PUBLIC_PORTAL_URL`. The single Payload instance uses `PAYLOAD_SECRET`.

## Phase 2 — strip infrastructure

**Delete:** `nginx/`, `docker-compose.tls.yml`, `scripts/init-letsencrypt.sh`.

**`docker-compose.yml`** is reduced to one service, `web`:
- Remove services `postgres`, `web-migrate`, `portal`, `nginx`.
- Remove the `bundled-db` profile and the `pgdata` volume. Keep the `uploads`
  volume (Payload media). The `internal` network may be dropped — a single
  service needs no user-defined network.
- `web` publishes an HTTP port for Cloudflare's origin pull (container `3000`).
- `web` keeps `extra_hosts: ["host.docker.internal:host-gateway"]` so
  `DATABASE_URL` can address the host Postgres.
- `web` keeps `env_file: .env` and the existing build args.

**Migration on startup:** the `web` container runs `payload migrate` before
`next start`. The runtime image must therefore carry the migration files and
enough of Payload to run the migrate command. This is the one piece of new
build work — the implementation plan resolves exactly how (entrypoint script
in the runtime stage, with the migration files and Payload CLI/runtime
present). If migrate fails, the container fails to start — preserving the
fail-closed behaviour `web-migrate` gave.

**Docs / env:** update `.env.example`, `.env.production`, and
`docs/local-prod-deploy.md` to describe the single-service stack, the
Cloudflare-fronted HTTP origin, and the one-command deploy.

## Deploy flow after

```sh
docker compose up -d --build
```

One command. Migration runs automatically as `web` starts. Cloudflare proxies
the domain to `server-ip:PORT`; TLS is terminated at Cloudflare.

## Constraints / notes

- **Cloudflare SSL mode:** use "Flexible" (Cloudflare→origin over HTTP) or
  install a Cloudflare Origin Certificate for "Full". The origin HTTP port
  should not be exposed to the public beyond Cloudflare — server firewall or a
  `cloudflared` tunnel. Firewall/tunnel hardening is **out of scope** for this
  spec; it is a server-admin step noted in the docs.
- The external Postgres still needs `listen_addresses` + a `pg_hba.conf` entry
  for the Docker bridge subnet — unchanged from the current `.env.production`
  notes, restated in the docs.

## Out of scope

- Changing any marketing-site, CMS, or API behaviour — this is a structural
  consolidation only.
- Reworking the portal auth mechanism (cookie, token) — carried over as-is.
- Firewall / `cloudflared` tunnel setup on the server.
- Localizing the `/login` and `/dashboard` routes.

## Verification

- Phase 1: `pnpm --filter @jakartabc/web build` succeeds; `apps/portal` gone
  from the workspace; local stack serves `/`, `/[locale]/...`, `/admin`,
  `/login`, and `/dashboard` (the last redirecting to `/login` when
  unauthenticated).
- Phase 2: `docker compose config` shows exactly one service; a clean
  `docker compose up -d --build` against an external Postgres brings `web`
  up healthy with the schema migrated; `docker compose` has no `nginx`,
  `certbot`, `portal`, `web-migrate`, or `postgres` service.
