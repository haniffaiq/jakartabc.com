# Local prod-like deploy

Compose stack di `docker-compose.yml` meniru production: postgres + web + portal + caddy.

## Run

```sh
docker compose up -d --build
```

Endpoints:
- web → http://localhost:3100
- portal → http://localhost:3101
- caddy (reverse proxy) → http://localhost:8080 (SITE_DOMAIN default `:80` = catch-all)
- postgres → localhost:5432 (host-mapped untuk build-time access, lihat di bawah)

## Why so many env knobs

`apps/web/src/env.ts` zod-validate semua env saat module import. `next build` import config
saat **collect page data** → validation jalan di build stage. Jadi env build = env runtime.

Build-time env diteruskan via `docker-compose.yml > services.web.build.args` →
`apps/web/Dockerfile` ARG/ENV di builder stage. Runtime pakai `env_file: .env`.

## Why `BUILD_DATABASE_URL`

Builder container tidak terhubung ke compose network, jadi alias `postgres` tak resolvable.
`BUILD_DATABASE_URL` pakai `host.docker.internal:5432` (postgres host-mapped via `ports`).
Runtime tetap pakai `DATABASE_URL=postgres://...@postgres:5432/...` (compose alias).

## Why `scripts/db-push.ts` exists

Payload v3 + `@payloadcms/db-postgres` hanya jalankan `pushDevSchema` saat
`NODE_ENV !== 'production'` (lihat `connect.js` di adapter). Build kita pakai
`NODE_ENV=production` → schema tak ke-push. Solusi sementara: `db-push.ts` jalan
sekali di Dockerfile builder dengan `NODE_ENV=development` (inline shell var)
sebelum `next build`, supaya schema sync ke postgres.

**Yang seharusnya dilakukan untuk prod sungguhan**:
1. `pnpm --filter @jakartabc/web exec payload migrate:create initial` lokal
2. Commit `apps/web/src/migrations/`
3. Hapus `db-push.ts` + `BUILD_DATABASE_URL` + `ports: 5432` mapping
4. Tambah `payload migrate` ke web container entrypoint sebelum `node server.js`

## Why `generateStaticParams` di `services/[slug]` dan `insights/[slug]` di-wrap try/catch

Build SSG memanggil Payload `find()` → query DB. Kalau DB unreachable saat build
(CI tanpa postgres, dev pertama kali, dst.), build crash. Wrap try/catch + return `[]`
membuat build tetap sukses; halaman ter-render on-demand saat runtime.

## Verifikasi cepat

```sh
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3101/
```
