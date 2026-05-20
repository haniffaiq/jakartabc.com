# Local prod-like deploy

Compose stack di `docker-compose.yml` adalah **app saja**:
**web + portal + web-migrate** (init container). Postgres dipakai sebagai
**instance shared/eksternal**, dan reverse proxy + TLS ditangani **nginx
native di host** (di luar repo ini).

## Run

```sh
docker compose up -d --build
```

Set `DATABASE_URL` di `.env` ke Postgres yang bisa dijangkau:

- DB di mesin host: pakai `host.docker.internal`, bukan `localhost`.
- Managed DB: tambah `?sslmode=require` (atau `no-verify` untuk RDS).

## Endpoints (local)

- web → http://localhost:3100
- portal → http://localhost:3101

Reverse proxy / TLS bukan bagian dari stack ini — di server, nginx native
host yang proxy ke kedua port tsb.

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

## Server: reverse proxy + TLS (nginx native host)

nginx + certbot di-setup langsung di server host, bukan di compose stack ini.
Proxy ke container app:

- `web`   → `http://127.0.0.1:3100`
- `portal` → `http://127.0.0.1:3101`

Prasyarat: DNS domain pointing ke IP server, port 80/443 publik, certbot
issue + renew cert untuk tiap server block.

## Cleanup / reset

```sh
docker compose down       # stop, keep volumes
docker compose down -v    # stop + drop uploads volume
```

Data Postgres tidak tersentuh `docker compose down` — DB instance eksternal.

## Verifikasi cepat

```sh
curl -s -o /dev/null -w "web:    %{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "portal: %{http_code}\n" http://localhost:3101/
```
