# Local prod-like deploy

Compose stack di `docker-compose.yml` adalah **app saja**:
**web + portal + web-migrate** (init container). Postgres, Redis, dan MinIO
dipakai sebagai **instance shared/eksternal**, dan reverse proxy + TLS
ditangani **nginx native di host** (di luar repo ini).

## Shared infra (lokal, OrbStack)

Infra lokal berasal dari project compose terpisah, `tools/infa-basic`, yang
memiliki network `shared-infra` dan menyediakan satu database/bucket/ACL-user
per app. Untuk repo ini namanya `jbc`.

Stack app **join network itu sebagai external**, jadi host-nya adalah nama
service infra — bukan `host.docker.internal`:

| Service  | Host dari dalam container                         | Published di host                  |
| -------- | ------------------------------------------------- | ---------------------------------- |
| Postgres | `postgres:5432`, db/user `jbc`                    | `127.0.0.1:5432`                   |
| Redis    | `redis:6379`, ACL user `jbc` (key prefix `jbc:*`) | `127.0.0.1:6379`                   |
| MinIO    | `minio:9000`, bucket `jbc`                        | `127.0.0.1:9000` (console `:9001`) |

Pastikan infra hidup dulu:

```sh
cd ../../tools/infa-basic && docker compose up -d postgres redis minio
```

`MINIO_PUBLIC_URL` dipakai browser, bukan container — isi dengan
`http://localhost:9000/jbc`. Bucket butuh anonymous read karena Payload
men-generate URL media langsung ke MinIO:

```sh
mc anonymous set download local/jbc
```

## Run

```sh
docker compose up -d --build
```

Di server (tanpa `shared-infra`), ganti network di `docker-compose.yml` dan
arahkan `DATABASE_URL` / `REDIS_URL` / `MINIO_ENDPOINT` ke host yang sesuai:

- Service di mesin host: pakai `host.docker.internal`, bukan `localhost`.
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

- `web` → `http://127.0.0.1:3100`
- `portal` → `http://127.0.0.1:3101`

Prasyarat: DNS domain pointing ke IP server, port 80/443 publik, certbot
issue + renew cert untuk tiap server block.

## Turnstile di NODE_ENV=production

`apps/web/src/env.ts` menolak test key always-pass milik Cloudflare saat
`NODE_ENV=production` — dan compose memang set production. Jadi untuk deploy
lokal, `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` diisi
placeholder: halaman tetap render, tapi submit contact/booking dijawab
`{ ok: false, code: 'captcha' }`. Isi key asli kalau mau menguji form
end-to-end.

## Cleanup / reset

```sh
docker compose down       # stop, keep volumes
docker compose down -v    # stop + drop uploads volume
```

Data Postgres, Redis, dan MinIO tidak tersentuh `docker compose down` —
semuanya instance eksternal milik `tools/infa-basic`.

## Verifikasi cepat

```sh
curl -s -o /dev/null -w "web:    %{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "portal: %{http_code}\n" http://localhost:3101/
```
