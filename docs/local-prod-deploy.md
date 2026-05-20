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
     (jalankan terhadap DB lokal manapun, hasilkan file diff baru).
  2. Commit file baru di `apps/web/src/migrations/`.
  3. Redeploy → `web-migrate` apply otomatis.

## Env validation at build time

`apps/web/src/env.ts` zod-validate semua env saat module import. `next build`
import config saat **collect page data** → validation jalan di build stage.
Build args diteruskan via `services.{web,portal}.build.args` →
ARG/ENV di builder stage. Runtime pakai `env_file: .env`.

Build **tidak konek ke DB**: `getPayloadClient()` (`apps/web/src/lib/payload.ts`)
throw saat `NEXT_PHASE=phase-production-build`, dan halaman DB-backed
(`services`, `pricing`, `insights`) pakai `dynamic = 'force-dynamic'` →
tak di-prerender saat build. `DATABASE_URL` di build args cuma perlu format
URL valid (zod check).

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
