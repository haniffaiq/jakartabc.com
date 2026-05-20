# Design: migrate reverse proxy from Caddy to nginx + certbot

Date: 2026-05-20

## Goal

Replace the Caddy reverse proxy with nginx, and replace Caddy's built-in
automatic HTTPS with certbot (Let's Encrypt). Behaviour parity: reverse proxy
for `web` and `portal`, automatic TLS certificate issuance and renewal on the
server, plain HTTP for the local prod-like stack.

## Why

User request. Trade-off accepted knowingly: nginx + certbot is more moving
parts than Caddy (separate cert lifecycle, manual renewal wiring) but is the
desired standard for this deployment.

## Decisions (locked)

- **ACME challenge:** HTTP-01 webroot. nginx serves
  `/.well-known/acme-challenge/` from a shared volume; requires public port 80
  and DNS already pointing at the host.
- **Renewal:** certbot runs as a long-lived container looping `certbot renew`;
  nginx loops `nginx -s reload` to pick up renewed certs. No host cron.
- **Local stack:** HTTP-only. The base compose file runs nginx without TLS and
  without certbot — same effective behaviour as Caddy today (TLS idle locally).
- **Local vs server split:** override file `docker-compose.tls.yml`, mirroring
  the existing `bundled-db` profile convention for explicitness.

## Architecture

### Services

Remove the `caddy` service. Add:

- `nginx` — always runs. Base compose: HTTP only, host port `8080:80`.
- `certbot` — added only by the TLS override. Shares two volumes with nginx.

`nginx` keeps `depends_on: [web]` and joins the `internal` network. `certbot`
needs no network — it shares state with nginx purely through volumes.

### Files

```
docker-compose.yml                       nginx service (HTTP), no certbot
docker-compose.tls.yml                   override: certbot + nginx :443 + letsencrypt mount
nginx/templates/app.conf.template        HTTP server blocks (local + acme)
nginx/templates/app-tls.conf.template    HTTPS server blocks (server only)
scripts/init-letsencrypt.sh              first-issuance bootstrap
```

`caddy/Caddyfile` is deleted. `caddy_data` and `caddy_config` volumes are
removed; `letsencrypt` and `acme_challenge` volumes are added.

### nginx configuration

The official `nginx` image renders `/etc/nginx/templates/*.template` through
`envsubst` into `/etc/nginx/conf.d/` at container start. Domain values are
injected as env vars: `WEB_DOMAIN`, `PORTAL_DOMAIN`, `ACME_EMAIL`.

**Base (`app.conf.template`) — always loaded:**

- One HTTP `server` block per domain (`WEB_DOMAIN` → `web:3000`,
  `PORTAL_DOMAIN` → `portal:3001`).
- `location /.well-known/acme-challenge/ { root /var/www/certbot; }` — served
  from the `acme_challenge` volume.
- All other locations `proxy_pass` to the upstream. This makes the **local
  stack work over plain HTTP** with no certificate.
- `proxy_set_header`: `Host`, `X-Forwarded-Proto $scheme`,
  `X-Forwarded-For $proxy_add_x_forwarded_for`, `X-Real-IP $remote_addr`.
- `gzip on`; `server_tokens off`.
- No HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy / CSP in
  nginx — `apps/web/next.config` already emits those. nginx does not duplicate
  app-level security headers. HSTS is the one exception (TLS-only, see below).

**TLS (`app-tls.conf.template`) — server only, mounted by the override:**

- HTTP server blocks change: keep the acme-challenge location, and `return 301
  https://$host$request_uri` for everything else.
- HTTPS `server` block per domain: `listen 443 ssl`, certificate at
  `/etc/letsencrypt/live/$WEB_DOMAIN/{fullchain,privkey}.pem`, same
  `proxy_pass` + `proxy_set_header` as base.
- Adds `Strict-Transport-Security "max-age=31536000; includeSubDomains;
  preload"` on the HTTPS blocks only.

When the TLS override is active, the override mounts `app-tls.conf.template`
in place of `app.conf.template` so only one set of server blocks is rendered.

### TLS override (`docker-compose.tls.yml`)

- `nginx`: adds host port `443:443`; mounts `letsencrypt` (read) and
  `acme_challenge` (read) volumes; swaps the template to `app-tls`.
- `certbot`: image `certbot/certbot`; mounts `letsencrypt` (write) and
  `acme_challenge` (write); entrypoint loops
  `certbot renew --webroot -w /var/www/certbot` then `sleep 12h`.

### Renewal flow

- `certbot` container: `while :; do certbot renew ...; sleep 12h; done`.
- `nginx` container entrypoint: a background loop
  `while :; do sleep 6h; nginx -s reload; done` so renewed certs are picked up
  without a restart.

### First issuance — `scripts/init-letsencrypt.sh`

Chicken-and-egg: nginx with the TLS config cannot start until a certificate
file exists, but certbot needs nginx serving port 80 to answer the challenge.
Standard `wmnnd/nginx-certbot` bootstrap:

1. Read `WEB_DOMAIN`, `PORTAL_DOMAIN`, `ACME_EMAIL` from `.env`.
2. Create a temporary self-signed dummy cert in `letsencrypt` so nginx TLS
   config can start.
3. `docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d nginx`.
4. Delete the dummy cert; run `certbot certonly --webroot -w /var/www/certbot`
   for the real certificate(s).
5. `docker compose ... exec nginx nginx -s reload`.

Run once per server. Idempotent: if a real cert already exists, skip to reload.

## Commands

- Local: `COMPOSE_PROFILES=bundled-db docker compose up -d --build` (unchanged).
- Server, first time: edit `.env` (`WEB_DOMAIN`, `PORTAL_DOMAIN`, `ACME_EMAIL`),
  then `./scripts/init-letsencrypt.sh`.
- Server, subsequent:
  `docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build`.

## Env vars

Added to `.env.example`:

- `WEB_DOMAIN` — public domain for `web` (replaces Caddy's `SITE_DOMAIN`).
- `PORTAL_DOMAIN` — public domain for `portal` (was hardcoded
  `app.jakartabc.com` in the Caddyfile).
- `ACME_EMAIL` — Let's Encrypt registration email (already present).

`SITE_DOMAIN` is renamed to `WEB_DOMAIN` for clarity; `SITE_DOMAIN` is removed.

## Out of scope

- Local TLS / self-signed for the local stack (chosen against).
- DNS-01 challenge and wildcard certs.
- nginx access-log file rotation — logs go to stdout/stderr for Docker to
  capture (Caddy's JSON rolling file log is not reproduced).
- Rate limiting, HTTP/3, Lua — not needed for this site.

## Testing / verification

- Local: `docker compose up -d --build` (bundled-db), then probe
  `http://localhost:8080/` and `/id/...` routes → expect `200` / documented
  redirects, parity with the current Caddy result.
- `nginx -t` config syntax check inside the container.
- Server TLS path cannot be tested locally (needs real DNS + port 80); the
  `init-letsencrypt.sh` flow is verified by inspection against the
  `wmnnd/nginx-certbot` reference pattern.

## Cleanup

- Delete `caddy/Caddyfile` and the `caddy/` directory.
- Remove `caddy_data`, `caddy_config` volumes from `docker-compose.yml`.
- Update `docs/local-prod-deploy.md`: replace the Caddy section, document the
  TLS override and `init-letsencrypt.sh`.
