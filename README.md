# jakartabc.com

Foreign Direct Investment consulting site for Jakarta Business Center.

- Spec: `docs/superpowers/specs/2026-05-18-jakartabc-design.md`
- Brand & visual system: `design-system.md`
- Phase 0 plan: `docs/superpowers/plans/2026-05-18-phase0-foundation.md`

## Stack

- Next.js 15 App Router + React 19
- Payload v3 mounted at `/admin`, Postgres 16 (shared/external instance)
- next-intl (EN default, ID prefixed `/id`)
- Tailwind CSS 3.4 + `@jakartabc/ui` tokens preset
- Native nginx reverse proxy on the server host (TLS, outside this repo)
- pnpm 9 workspace + Turborepo

## Repo layout

```text
apps/web              Next.js app (marketing + Payload admin)
apps/portal           Next.js client portal
packages/ui           Design tokens + base components
packages/config       Shared eslint, tsconfig, prettier
docker-compose.yml    App-only stack (web + portal + web-migrate)
```

The canonical local checkout path for Hanif's machine is:

```bash
cd /home/hanif/jakartabc.com
```

## Local development

Requirements:

- Node 20.18+
- pnpm 9.12+
- Docker with the Compose plugin

```bash
cd /home/hanif/jakartabc.com
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install
cp .env.example .env
```

Edit `.env` before booting the app. At minimum, set:

- `DATABASE_URL`
- `PAYLOAD_SECRET` (32+ random characters)
- `NEXT_PUBLIC_SITE_URL`
- `DEFAULT_LOCALE=en`

Point `DATABASE_URL` at a reachable Postgres 16 (shared dev instance or a
local one you manage), apply the schema, then start the app:

```bash
pnpm --filter @jakartabc/web exec payload generate:types
pnpm --filter @jakartabc/web exec payload migrate
pnpm dev
```

`pnpm dev` first runs `scripts/sync-dev-env.mjs`, which derives
`apps/*/.env.local` from the root `.env`. Two reasons it has to:
`next dev` only reads env files from the Next app directory, and the root
`.env` addresses shared infra by its Compose service names, which do not
resolve from the host. Edit the root `.env` — the generated files are
overwritten on every run.

A skipped `payload migrate` shows up as `relation "services" does not exist`
and a 500 on every DB-backed page.

Visit:

- `http://localhost:3000` — EN site
- `http://localhost:3000/id` — ID site
- `http://localhost:3000/admin` — Payload admin; initial access requires the one-shot bootstrap command below

## Verification commands

Run these before opening or merging a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`pnpm test` runs the Vitest unit suite. `pnpm test:e2e` runs the Playwright smoke suite.

## VPS provisioning (Ubuntu 24.04 LTS)

Target: Hetzner CX22 class or similar.

### 1. Create the deploy user

Run as root on the VPS:

```bash
adduser --disabled-password deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# append your public key to /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

### 2. Configure the firewall

Replace `22` with the custom SSH port if the server uses one.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Install Docker

Use Docker's official Ubuntu repository:

```bash
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | tee /etc/apt/keyrings/docker.asc >/dev/null
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker deploy
```

Log out and back in as `deploy` after adding the user to the Docker group.

### 4. Point DNS at the VPS

Create or update the `staging.jakartabc.com` A record to point at the VPS IPv4 address.

### 4b. Native nginx + TLS (host)

The reverse proxy and TLS are handled by a native nginx on the server host,
not by this compose stack. Set up nginx + certbot directly on the host and
proxy to the app containers:

- `web` → `http://127.0.0.1:3100`
- `portal` → `http://127.0.0.1:3101`

### 5. Clone and configure

```bash
sudo -iu deploy
mkdir -p /opt/jakartabc.com
cd /opt/jakartabc.com
git clone <repo-url> .
cp .env.example .env
chmod 600 .env
```

Edit `.env` with production secrets. Do not commit `.env`.

Important production values:

- `DATABASE_URL` — shared/external Postgres. For a DB on the server host use `host.docker.internal` (e.g. `postgresql://USER:PW@host.docker.internal:5432/jakartabc`)
- `PAYLOAD_SECRET=<32+ character random secret>`
- `NEXT_PUBLIC_SITE_URL=https://staging.jakartabc.com`
- `DEFAULT_LOCALE=en`
- Email, Turnstile, and revalidation keys when the corresponding phases are enabled

### 6. Boot the stack

```bash
docker compose pull
docker compose up -d --build
docker compose ps
```

The `web-migrate` init container applies Payload migrations, then `web` and
`portal` start. Confirm both containers are healthy, then verify the host
nginx proxies them over TLS.

### 7. Create the first admin

Run this once, after migrations, against a database that does not already contain
an admin. Never run bootstrap commands concurrently. The password must contain at
least 16 characters, including uppercase, lowercase, a number, and a symbol.

```bash
(
  bootstrap_admin_email=''
  bootstrap_admin_password=''

  cleanup_bootstrap_admin() {
    unset bootstrap_admin_email bootstrap_admin_password
  }
  trap cleanup_bootstrap_admin EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  trap 'exit 129' HUP

  read -rp 'Initial admin email: ' bootstrap_admin_email
  read -rsp 'Initial admin password: ' bootstrap_admin_password
  printf '\n'

  BOOTSTRAP_ADMIN_EMAIL="$bootstrap_admin_email" \
  BOOTSTRAP_ADMIN_PASSWORD="$bootstrap_admin_password" \
    docker compose run --rm \
      -e BOOTSTRAP_ADMIN_EMAIL \
      -e BOOTSTRAP_ADMIN_PASSWORD \
      web-migrate pnpm --filter @jakartabc/web bootstrap:admin
)
```

The command refuses to run if any admin exists and never promotes an existing
account. Do not add either bootstrap variable to `.env`, Compose, shell history,
or shared runtime configuration. The prompt and command run in a subshell, and
its exit and signal traps clean the local variables; the parent shell never
receives the credentials. After success, sign in at
`https://staging.jakartabc.com/admin`; all later users and roles are managed there
by an admin.

## Deploy update

```bash
ssh deploy@vps
cd /opt/jakartabc.com
git pull
docker compose pull
docker compose up -d --build web
docker compose ps
```

Check the public routes after the update:

```bash
curl -I https://staging.jakartabc.com/
curl -I https://staging.jakartabc.com/id
curl -I https://staging.jakartabc.com/admin
```

## Rollback

```bash
ssh deploy@vps
cd /opt/jakartabc.com
git checkout <prev-sha>
docker compose up -d --build web
docker compose ps
```

After rollback, open the site and admin URL to confirm the previous version is healthy.

## Backup (host cron)

Create a backup directory owned by a restricted user and not served by nginx:

```bash
sudo mkdir -p /backup
sudo chown deploy:deploy /backup
chmod 700 /backup
```

Install the host cron entries:

```cron
0 3 * * * pg_dump -h localhost -U jakartabc jakartabc | gzip > /backup/db-$(date +\%F).sql.gz
0 4 * * * find /backup -name 'db-*.sql.gz' -mtime +14 -delete
```

This keeps 14 days of nightly Postgres dumps. Phase later: copy encrypted backups offsite to S3 or Backblaze B2.

## Restore

Stop the web container before restoring a database snapshot:

```bash
ssh deploy@vps
cd /opt/jakartabc.com
docker compose stop web
gunzip < /backup/db-YYYY-MM-DD.sql.gz | psql -U jakartabc jakartabc
docker compose up -d web
docker compose ps
```

Postgres runs as a shared/external instance — `pg_dump` and `psql` run
against it directly from the host, not through a container.

## Secret rotation

Rotating `PAYLOAD_SECRET` invalidates all admin sessions. Communicate the maintenance window before rotation.

```bash
ssh deploy@vps
cd /opt/jakartabc.com
$EDITOR .env
docker compose up -d web
```

After rotation, ask admins to sign in again and verify `/admin` works.

## Operational notes

- Keep `.env` mode `0600` and owned by `deploy`.
- Keep ports 80 and 443 open so the host nginx + certbot can renew TLS certificates.
- Do not put production secrets in GitHub issues, PR comments, logs, or commits.
- `staging.jakartabc.com` is the Phase 0 target. Production domain cutover is a later ops decision.

## Portal deploy (Phase 4)

The client portal runs as a separate container on subdomain `app.jakartabc.com`.

**One-time DNS setup:**

1. Add an `A` record for `app.jakartabc.com` pointing to the VPS IP (same as the main site). For staging, use the equivalent `app.staging.jakartabc.com` host if the staging DNS pattern is separate.
2. Wait for DNS propagation and verify it from outside the VPS:

   ```bash
   dig app.jakartabc.com
   ```

**First-time portal deploy:**

```bash
ssh deploy@vps
cd /opt/jakartabc.com
git pull
docker compose up -d --build portal
```

Add an `app.jakartabc.com` server block to the host nginx config proxying to `http://127.0.0.1:3101`, then issue its TLS certificate with certbot.

**Creating the first portal user:**

The portal has no self-service signup. To create a user, log into the web admin at `https://jakartabc.com/admin` and add a new entry to the `users` collection. Set `role` to `client`. The user will receive password-reset instructions via Payload's auth UI, or share initial credentials securely out-of-band.

**Verifying portal:**

- Visit `https://app.jakartabc.com/login` — login page renders over TLS.
- Sign in with a valid client user — lands on `/dashboard`.
- Logout — returns to `/login`.
