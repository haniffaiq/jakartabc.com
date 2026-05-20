# nginx + certbot Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Caddy reverse proxy with nginx, and Caddy's automatic HTTPS with certbot (Let's Encrypt HTTP-01 webroot).

**Architecture:** Base `docker-compose.yml` runs an `nginx` service that reverse-proxies `web` over plain HTTP (local prod-like stack, host port 8080). A `docker-compose.tls.yml` override adds a `certbot` service, host ports 80/443, and swaps nginx to a TLS config that terminates HTTPS for the real domains. nginx config is rendered from templates by the official image's `envsubst` step. First certificate issuance is bootstrapped by `scripts/init-letsencrypt.sh`; renewal runs as a loop inside the `certbot` container.

**Tech Stack:** Docker Compose, nginx 1.27-alpine (official image template/envsubst feature), certbot/certbot, Let's Encrypt HTTP-01 webroot.

**Note on testing:** This is infrastructure config — there are no unit tests. Each task's verification step (`nginx -t`, `docker compose config`, `curl` probes) is the equivalent of a test and MUST pass before committing.

**Spec:** `docs/superpowers/specs/2026-05-20-nginx-certbot-migration-design.md`

---

## File Structure

```
docker-compose.yml                          MODIFY — replace caddy service with nginx; drop caddy volumes
docker-compose.tls.yml                       CREATE — server-only override: certbot + nginx TLS
nginx/templates/http/default.conf.template   CREATE — base HTTP-only reverse proxy (local)
nginx/templates/tls/default.conf.template    CREATE — HTTP(acme+redirect) + HTTPS reverse proxy (server)
scripts/init-letsencrypt.sh                  CREATE — first-issuance bootstrap
caddy/Caddyfile                              DELETE
.env.example                                 MODIFY — replace Caddy vars with nginx/TLS vars
docs/local-prod-deploy.md                    MODIFY — document nginx + TLS deploy flow
```

**Compose merge mechanics this plan relies on:**
- `volumes` entries are keyed by container target path; an override entry with the same target **replaces** the base entry. Used to swap the nginx templates directory.
- `ports` entries are **concatenated** across files. The server therefore exposes 8080, 80, and 443 — the extra 8080 is harmless.
- `environment` keys merge, override wins per key.

---

## Task 1: Base nginx service (HTTP-only, local stack)

**Files:**
- Create: `nginx/templates/http/default.conf.template`
- Modify: `docker-compose.yml` (lines 117-139)
- Delete: `caddy/Caddyfile`

- [ ] **Step 1: Create the base HTTP nginx template**

Create `nginx/templates/http/default.conf.template`:

```nginx
# Base reverse proxy — plain HTTP only. Used by the local prod-like stack.
# Rendered by the nginx image's envsubst step; this file has no ${VARS}.
server {
    listen 80;
    server_name _;
    server_tokens off;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Security headers (HSTS / CSP / X-Frame-Options etc.) are emitted by the
    # Next.js app (apps/web/next.config) — nginx does not duplicate them here.

    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

- [ ] **Step 2: Replace the `caddy` service in `docker-compose.yml`**

Delete the entire `caddy:` service block (lines 117-133) and replace it with:

```yaml
  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    depends_on:
      - web
    ports:
      - '8080:80'
    volumes:
      - ./nginx/templates/http:/etc/nginx/templates:ro
    environment:
      NGINX_ENVSUBST_FILTER: 'WEB_DOMAIN|PORTAL_DOMAIN'
    networks:
      - internal
```

- [ ] **Step 3: Drop the Caddy volumes**

In `docker-compose.yml`, change the top-level `volumes:` block from:

```yaml
volumes:
  pgdata:
  uploads:
  caddy_data:
  caddy_config:
```

to:

```yaml
volumes:
  pgdata:
  uploads:
```

- [ ] **Step 4: Delete the Caddy config**

Run:
```bash
git rm caddy/Caddyfile
```
Expected: `rm 'caddy/Caddyfile'`. The now-empty `caddy/` directory is removed by git automatically.

- [ ] **Step 5: Verify the compose file parses**

Run: `docker compose config >/dev/null && echo OK`
Expected: `OK` (no `caddy` service, no `caddy_data`/`caddy_config` volume errors).

- [ ] **Step 6: Verify nginx config syntax**

Run:
```bash
docker run --rm -v "$PWD/nginx/templates/http:/etc/nginx/templates:ro" \
  -e NGINX_ENVSUBST_FILTER='WEB_DOMAIN|PORTAL_DOMAIN' \
  nginx:1.27-alpine sh -c '/docker-entrypoint.sh nginx -t'
```
Expected: ends with `nginx: configuration file /etc/nginx/nginx.conf test is successful`.

- [ ] **Step 7: Verify the local stack serves through nginx**

Run:
```bash
COMPOSE_PROFILES=bundled-db docker compose up -d --build
sleep 5
curl -s -o /dev/null -w "nginx:8080 -> %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "id home -> %{http_code}\n" http://localhost:8080/id/
```
Expected: `nginx:8080 -> 200` (or `308` redirect to a locale — same as the Caddy result), `id home -> 200`.

- [ ] **Step 8: Commit**

```bash
git add nginx/templates/http/default.conf.template docker-compose.yml
git commit -m "$(cat <<'EOF'
feat(infra): replace Caddy with nginx reverse proxy (HTTP base)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: TLS override — certbot + nginx HTTPS

**Files:**
- Create: `nginx/templates/tls/default.conf.template`
- Create: `docker-compose.tls.yml`

- [ ] **Step 1: Create the TLS nginx template**

Create `nginx/templates/tls/default.conf.template`:

```nginx
# Server reverse proxy with TLS termination. Rendered by the nginx image's
# envsubst step — ${WEB_DOMAIN} and ${PORTAL_DOMAIN} are substituted
# (NGINX_ENVSUBST_FILTER limits substitution to those two names so nginx's
# own $host / $scheme / etc. are left intact).
#
# A single SAN certificate covers both domains; its lineage directory is named
# after the first domain (WEB_DOMAIN), so both server blocks point there.

# --- HTTP: serve ACME challenge, redirect everything else to HTTPS ---
server {
    listen 80;
    server_name ${WEB_DOMAIN} ${PORTAL_DOMAIN};
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# --- HTTPS: web ---
server {
    listen 443 ssl;
    http2 on;
    server_name ${WEB_DOMAIN};
    server_tokens off;

    ssl_certificate     /etc/letsencrypt/live/${WEB_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${WEB_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}

# --- HTTPS: portal ---
server {
    listen 443 ssl;
    http2 on;
    server_name ${PORTAL_DOMAIN};
    server_tokens off;

    ssl_certificate     /etc/letsencrypt/live/${WEB_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${WEB_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location / {
        proxy_pass http://portal:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

- [ ] **Step 2: Create `docker-compose.tls.yml`**

Create `docker-compose.tls.yml` in the repo root:

```yaml
# Server-only override. Adds TLS termination + certbot to the base stack.
#
#   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
#
# First run on a fresh server: ./scripts/init-letsencrypt.sh  (see that script).
name: jakartabc

services:
  nginx:
    # Swap the templates dir (same target path replaces the base mount) and
    # add the cert + ACME-webroot volumes. Add host ports 80/443.
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/templates/tls:/etc/nginx/templates:ro
      - letsencrypt:/etc/letsencrypt:ro
      - acme_challenge:/var/www/certbot:ro
    environment:
      NGINX_ENVSUBST_FILTER: 'WEB_DOMAIN|PORTAL_DOMAIN'
      WEB_DOMAIN: ${WEB_DOMAIN}
      PORTAL_DOMAIN: ${PORTAL_DOMAIN}
    # docker-entrypoint.sh renders templates, then execs this command:
    # nginx in the foreground + a loop that reloads it every 6h so renewed
    # certificates are picked up without a restart.
    command:
      - sh
      - -c
      - "while :; do sleep 6h; nginx -s reload; done & nginx -g 'daemon off;'"

  certbot:
    image: certbot/certbot:latest
    restart: unless-stopped
    volumes:
      - letsencrypt:/etc/letsencrypt
      - acme_challenge:/var/www/certbot
    # Renew loop: attempt renewal every 12h. nginx reloads itself separately.
    entrypoint: sh -c 'trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot --quiet; sleep 12h & wait $${!}; done'

volumes:
  letsencrypt:
  acme_challenge:
```

- [ ] **Step 3: Verify the merged config selects the TLS template and certbot**

Run:
```bash
WEB_DOMAIN=staging.jakartabc.com PORTAL_DOMAIN=app.jakartabc.com \
  docker compose -f docker-compose.yml -f docker-compose.tls.yml config
```
Expected, in the rendered output:
- a `certbot` service is present;
- the `nginx` service `volumes` lists `./nginx/templates/tls` mounted at `/etc/nginx/templates` (NOT `templates/http` — the base mount must be replaced, not duplicated);
- `nginx` ports include `80`, `443`, and `8080`.

If `templates/http` still appears for the `/etc/nginx/templates` target, STOP — the volume override did not replace it; report this before continuing.

- [ ] **Step 4: Verify the TLS nginx config syntax**

The TLS config references certificate files. Provide a throwaway self-signed cert so `nginx -t` can parse it:

```bash
TMP=$(mktemp -d)
mkdir -p "$TMP/live/staging.jakartabc.com"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$TMP/live/staging.jakartabc.com/privkey.pem" \
  -out "$TMP/live/staging.jakartabc.com/fullchain.pem" -subj '/CN=localhost'
docker run --rm \
  -v "$PWD/nginx/templates/tls:/etc/nginx/templates:ro" \
  -v "$TMP:/etc/letsencrypt:ro" \
  -e NGINX_ENVSUBST_FILTER='WEB_DOMAIN|PORTAL_DOMAIN' \
  -e WEB_DOMAIN=staging.jakartabc.com -e PORTAL_DOMAIN=app.jakartabc.com \
  nginx:1.27-alpine sh -c '/docker-entrypoint.sh nginx -t'
rm -rf "$TMP"
```
Expected: ends with `nginx: configuration file /etc/nginx/nginx.conf test is successful`.

- [ ] **Step 5: Commit**

```bash
git add nginx/templates/tls/default.conf.template docker-compose.tls.yml
git commit -m "$(cat <<'EOF'
feat(infra): add nginx TLS override + certbot service

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: First-issuance bootstrap script

**Files:**
- Create: `scripts/init-letsencrypt.sh`

- [ ] **Step 1: Create `scripts/init-letsencrypt.sh`**

Create `scripts/init-letsencrypt.sh`:

```sh
#!/usr/bin/env sh
# First-time Let's Encrypt certificate issuance for the nginx + certbot stack.
#
# Run ONCE per server, after DNS for both domains points at this host:
#     ./scripts/init-letsencrypt.sh
# Dry-run against the LE staging CA first (no rate limits):
#     STAGING=1 ./scripts/init-letsencrypt.sh
#
# Chicken-and-egg: nginx with the TLS config will not start until certificate
# files exist, but certbot needs nginx serving :80 to answer the HTTP-01
# challenge. So: create a dummy cert -> start nginx -> delete dummy ->
# request the real cert -> reload nginx.
set -eu

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.tls.yml"

[ -f .env ] || { echo "ERROR: .env not found (run from repo root)"; exit 1; }
# shellcheck disable=SC1091
. ./.env
: "${WEB_DOMAIN:?set WEB_DOMAIN in .env}"
: "${PORTAL_DOMAIN:?set PORTAL_DOMAIN in .env}"
: "${ACME_EMAIL:?set ACME_EMAIL in .env}"

STAGING="${STAGING:-0}"
LIVE="/etc/letsencrypt/live/${WEB_DOMAIN}"

echo "### 1/5 Creating dummy certificate for ${WEB_DOMAIN} ..."
$COMPOSE run --rm --entrypoint sh certbot -c "\
  mkdir -p '${LIVE}' && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '${LIVE}/privkey.pem' \
    -out '${LIVE}/fullchain.pem' \
    -subj '/CN=localhost'"

echo "### 2/5 Starting nginx ..."
$COMPOSE up -d --build nginx

echo "### 3/5 Deleting dummy certificate ..."
$COMPOSE run --rm --entrypoint sh certbot -c "\
  rm -rf '/etc/letsencrypt/live/${WEB_DOMAIN}' \
         '/etc/letsencrypt/archive/${WEB_DOMAIN}' \
         '/etc/letsencrypt/renewal/${WEB_DOMAIN}.conf'"

echo "### 4/5 Requesting Let's Encrypt certificate ..."
STAGING_ARG=""
[ "$STAGING" = "1" ] && STAGING_ARG="--staging"
# shellcheck disable=SC2086
$COMPOSE run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  $STAGING_ARG \
  --email "${ACME_EMAIL}" --agree-tos --no-eff-email \
  -d "${WEB_DOMAIN}" -d "${PORTAL_DOMAIN}"

echo "### 5/5 Reloading nginx ..."
$COMPOSE exec nginx nginx -s reload

echo
echo "Done. Bring up the full TLS stack with:"
echo "    $COMPOSE up -d --build"
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/init-letsencrypt.sh`

- [ ] **Step 3: Verify the script is syntactically valid**

Run: `sh -n scripts/init-letsencrypt.sh && echo OK`
Expected: `OK` (no syntax errors). The script is not executed end-to-end — it requires a real server with public DNS.

- [ ] **Step 4: Commit**

```bash
git add scripts/init-letsencrypt.sh
git commit -m "$(cat <<'EOF'
feat(infra): add Let's Encrypt first-issuance bootstrap script

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Env example + deploy docs

**Files:**
- Modify: `.env.example` (lines 1-8 header, lines 35-39 Caddy block)
- Modify: `docs/local-prod-deploy.md`

- [ ] **Step 1: Update the `.env.example` header comment**

In `.env.example`, replace the header block (lines 1-8):

```
# ============================================================
# LOCAL DOCKER PORTS (avoid host collisions; e.g. petag on 3000/5432)
# Container internal ports unchanged. Host-side mapping:
#   web      → http://localhost:3100  (container 3000)
#   portal   → http://localhost:3101  (container 3001)
#   caddy    → http://localhost:8080  / https://localhost:8443
#   postgres (dev compose) → localhost:5433  (container 5432)
# ============================================================
```

with:

```
# ============================================================
# LOCAL DOCKER PORTS (avoid host collisions; e.g. petag on 3000/5432)
# Container internal ports unchanged. Host-side mapping:
#   web      → http://localhost:3100  (container 3000)
#   portal   → http://localhost:3101  (container 3001)
#   nginx    → http://localhost:8080  (container 80)
#   postgres (dev compose) → localhost:5433  (container 5432)
# ============================================================
```

- [ ] **Step 2: Replace the Caddy env block**

In `.env.example`, replace the Caddy block (lines 35-39):

```
# ----- Caddy -----
# Local docker run: set SITE_DOMAIN=:80 (Caddy listens on all hostnames; host port 8080 maps in)
# Staging/prod: use real domain (e.g. staging.jakartabc.com)
SITE_DOMAIN=:80
ACME_EMAIL=ops@jakartabc.com
```

with:

```
# ----- nginx / TLS (certbot) -----
# Local docker stack: nginx serves plain HTTP on http://localhost:8080 and
# these values are unused. They are REQUIRED for the server TLS stack
# (docker-compose.tls.yml) and scripts/init-letsencrypt.sh.
WEB_DOMAIN=staging.jakartabc.com
PORTAL_DOMAIN=app.jakartabc.com
ACME_EMAIL=ops@jakartabc.com
```

- [ ] **Step 3: Rewrite `docs/local-prod-deploy.md`**

Replace the entire contents of `docs/local-prod-deploy.md` with:

````markdown
# Local prod-like deploy

Compose stack di `docker-compose.yml` meniru production:
**web + portal + nginx + web-migrate** (init container), dengan **postgres
opsional** (profile `bundled-db`).

## Run — bundled local postgres

```sh
COMPOSE_PROFILES=bundled-db docker compose up -d --build
```

## Run — external postgres (Supabase / RDS / Neon / dst.)

1. Ubah `DATABASE_URL` di `.env` → connection string DB eksternal.
   - DB di mesin host: pakai `host.docker.internal`, bukan `localhost`.
   - Managed DB: tambah `?sslmode=require` (atau `no-verify` untuk RDS).
2. ```sh
   docker compose up -d --build
   ```
   (Tanpa profile. Service `postgres` tak di-start.)

## Endpoints (local)

- web → http://localhost:3100
- portal → http://localhost:3101
- nginx (reverse proxy) → http://localhost:8080

nginx lokal melayani HTTP saja, proxy ke `web`. Portal diakses langsung
lewat port 3101.

## How migrations work

- Migration files committed di `apps/web/src/migrations/`.
- Service `web-migrate` (target: `builder` stage) jalan sekali per `up`,
  command `pnpm --filter @jakartabc/web exec payload migrate`.
- `web` dan `portal` `depends_on.web-migrate.condition: service_completed_successfully`
  — server app baru start setelah schema sinkron.
- Bila ada perubahan collection di Payload:
  1. `pnpm --filter @jakartabc/web exec payload migrate:create <name>`
  2. Commit file baru di `apps/web/src/migrations/`.
  3. Redeploy → `web-migrate` apply otomatis.

## Env validation at build time

`apps/web/src/env.ts` zod-validate semua env saat module import. `next build`
import config saat collect page data → validation jalan di build stage.
Build args diteruskan via `services.{web,portal}.build.args`.

Build **tidak konek ke DB**: `getPayloadClient()` (`apps/web/src/lib/payload.ts`)
throw saat `NEXT_PHASE=phase-production-build`, dan halaman DB-backed
(`services`, `pricing`, `insights`) pakai `dynamic = 'force-dynamic'` →
tak di-prerender saat build.

## Server deploy with TLS (nginx + certbot)

`docker-compose.tls.yml` adalah override khusus server: menambah service
`certbot`, host port 80/443, dan menukar nginx ke config TLS.

### Prasyarat

- DNS `WEB_DOMAIN` dan `PORTAL_DOMAIN` sudah pointing ke IP server.
- Port 80 dan 443 publik (HTTP-01 challenge butuh port 80).
- `.env`: set `WEB_DOMAIN`, `PORTAL_DOMAIN`, `ACME_EMAIL`.

### First issuance (sekali per server)

```sh
./scripts/init-letsencrypt.sh
# dry-run dulu (LE staging CA, no rate limit):
STAGING=1 ./scripts/init-letsencrypt.sh
```

Script: bikin dummy cert → start nginx → hapus dummy → request cert asli
via certbot webroot → reload nginx.

### Run / redeploy

```sh
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
```

### Renewal

Otomatis: container `certbot` loop `certbot renew` tiap 12 jam; container
`nginx` reload diri sendiri tiap 6 jam untuk ambil cert baru. Tak perlu cron.

## Cleanup / reset

```sh
docker compose down                                 # stop, keep volumes
docker compose down -v                              # stop + drop pgdata + uploads
COMPOSE_PROFILES=bundled-db docker compose down -v  # include bundled postgres
# server TLS stack:
docker compose -f docker-compose.yml -f docker-compose.tls.yml down
```

## Verifikasi cepat

```sh
curl -s -o /dev/null -w "web:    %{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "portal: %{http_code}\n" http://localhost:3101/
curl -s -o /dev/null -w "nginx:  %{http_code}\n" http://localhost:8080/
```
````

- [ ] **Step 4: Commit**

```bash
git add .env.example docs/local-prod-deploy.md
git commit -m "$(cat <<'EOF'
docs(infra): document nginx + certbot deploy; drop Caddy env vars

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Full-stack verification

**Files:** none (verification only)

- [ ] **Step 1: Rebuild the local stack cleanly**

Run:
```bash
COMPOSE_PROFILES=bundled-db docker compose down
COMPOSE_PROFILES=bundled-db docker compose up -d --build
sleep 6
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
```
Expected: `postgres`, `web`, `portal`, `nginx` all `Up`; `web` and `portal` `(healthy)`; `web-migrate` exited 0. No `caddy` service.

- [ ] **Step 2: Probe routes through nginx**

Run:
```bash
for p in / /insights /pricing /services /about; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$p")
  echo "nginx $p -> $c"
done
```
Expected: every route returns `200` or a `30x` redirect (`/` may redirect to a locale) — matching the behaviour Caddy produced. No `502`/`504`.

- [ ] **Step 3: Confirm no Caddy references remain**

Run: `grep -rin caddy docker-compose.yml docker-compose.tls.yml .env.example docs/local-prod-deploy.md || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Verify the TLS override still merges correctly**

Run:
```bash
WEB_DOMAIN=staging.jakartabc.com PORTAL_DOMAIN=app.jakartabc.com \
  docker compose -f docker-compose.yml -f docker-compose.tls.yml config >/dev/null && echo OK
```
Expected: `OK`.

- [ ] **Step 5: Final commit (if any verification triggered fixes)**

If Steps 1-4 all passed with no changes needed, skip this step. Otherwise commit the fixes:

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(infra): nginx migration verification fixes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- HTTP-01 webroot challenge → Task 2 (`location /.well-known/acme-challenge/`), Task 3 (`certbot certonly --webroot`). ✓
- certbot renewal loop + nginx reload loop → Task 2 (`certbot` entrypoint, `nginx` command). ✓
- HTTP-only local stack → Task 1 (base `nginx` service + HTTP template). ✓
- Override-file split → Task 2 (`docker-compose.tls.yml`). ✓
- nginx templates / envsubst, `WEB_DOMAIN`/`PORTAL_DOMAIN`/`ACME_EMAIL` → Tasks 1-2 (`NGINX_ENVSUBST_FILTER`), Task 4 (`.env.example`). ✓
- HSTS TLS-only, no duplicated app headers → Task 2 template (HSTS in 443 blocks only; base template comment). ✓
- First-issuance bootstrap → Task 3. ✓
- Commands (local / first-time / server) → Task 4 docs. ✓
- Cleanup: delete Caddyfile, drop caddy volumes, update docs → Task 1 (Caddyfile + volumes), Task 4 (docs). ✓
- Out of scope (local TLS, DNS-01, log rotation) → not implemented, correct. ✓

**Placeholder scan:** No TBD/TODO; every file has complete content; every command has expected output. ✓

**Type/name consistency:** `WEB_DOMAIN` / `PORTAL_DOMAIN` / `ACME_EMAIL` used identically across templates, compose override, init script, and `.env.example`. Volume names `letsencrypt` / `acme_challenge` consistent between `nginx` and `certbot` services and the top-level `volumes:` block. Cert lineage path `/etc/letsencrypt/live/${WEB_DOMAIN}/` consistent between the TLS template and the init script. ✓
