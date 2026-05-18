# jakartabc.com

Foreign Direct Investment consulting site for Jakarta Business Center.

- Spec: `docs/superpowers/specs/2026-05-18-jakartabc-design.md`
- Brand & visual system: `design-system.md`
- Phase 0 plan: `docs/superpowers/plans/2026-05-18-phase0-foundation.md`

## Stack

- Next.js 15 App Router + React 19
- Payload v3 mounted at `/admin`, Postgres 16
- next-intl (EN default, ID prefixed `/id`)
- Tailwind CSS 3.4 + `@jakartabc/ui` tokens preset
- Caddy 2 reverse proxy, automatic Let's Encrypt TLS
- pnpm 9 workspace + Turborepo

## Repo layout

```text
apps/web              Next.js app (marketing + Payload admin)
packages/ui           Design tokens + base components
packages/config       Shared eslint, tsconfig, prettier
caddy/                Caddyfile
docker-compose.yml    Production stack
docker-compose.dev.yml Local postgres only
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

Start the local database and app:

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm --filter @jakartabc/web exec payload generate:types
pnpm dev
```

Visit:

- `http://localhost:3000` — EN site
- `http://localhost:3000/id` — ID site
- `http://localhost:3000/admin` — Payload admin; first signup becomes admin

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

Create or update the `staging.jakartabc.com` A record to point at the VPS IPv4 address. Caddy will request the Let's Encrypt certificate after the stack starts and DNS resolves.

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

- `DATABASE_URL=postgres://jakartabc:<password>@postgres:5432/jakartabc`
- `PAYLOAD_SECRET=<32+ character random secret>`
- `NEXT_PUBLIC_SITE_URL=https://staging.jakartabc.com`
- `DEFAULT_LOCALE=en`
- Email, Turnstile, and revalidation keys when the corresponding phases are enabled

### 6. Boot the stack

```bash
docker compose pull
docker compose up -d --build
docker compose ps
docker compose logs -f caddy
```

Confirm that Caddy logs show successful TLS issuance.

### 7. Create the first admin

Visit `https://staging.jakartabc.com/admin` and create the initial admin account. Payload makes only the first signup the admin.

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

Create a backup directory owned by a restricted user and not served by Caddy:

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

If Postgres is only reachable inside Docker, run `pg_dump` and `psql` through the postgres container instead:

```bash
docker compose exec -T postgres pg_dump -U jakartabc jakartabc | gzip > /backup/db-$(date +\%F).sql.gz
gunzip < /backup/db-YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U jakartabc jakartabc
```

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
- Keep ports 80 and 443 open so Caddy can renew Let's Encrypt certificates.
- Do not put production secrets in GitHub issues, PR comments, logs, or commits.
- `staging.jakartabc.com` is the Phase 0 target. Production domain cutover is a later ops decision.
