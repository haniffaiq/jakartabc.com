# Local prod-like deploy

Compose stack di `docker-compose.yml` meniru production:
**web + portal + caddy + web-migrate** (init container), dengan **postgres
opsional** (profile `bundled-db`).

## Run — bundled local postgres

```sh
COMPOSE_PROFILES=bundled-db docker compose up -d --build
```

## Run — external postgres (Supabase / RDS / Neon / dst.)

1. Ubah `DATABASE_URL` di `.env` → connection string DB eksternal.
2. ```sh
   docker compose up -d --build
   ```
   (Tanpa profile. Service `postgres` tak di-start.)

## Endpoints

- web → http://localhost:3100
- portal → http://localhost:3101
- caddy (reverse proxy) → http://localhost:8080

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

Build **tidak konek ke DB**. `DATABASE_URL` di build args cuma perlu format
URL valid (zod check); query DB di SSG di-wrap try/catch + return `[]`
supaya halaman jadi dinamis kalau DB tak reachable saat build.

## Cleanup / reset

```sh
docker compose down                                 # stop, keep volumes
docker compose down -v                              # stop + drop pgdata + uploads
COMPOSE_PROFILES=bundled-db docker compose down -v  # include bundled postgres
```

## Verifikasi cepat

```sh
curl -s -o /dev/null -w "web: %{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "portal: %{http_code}\n" http://localhost:3101/
```
