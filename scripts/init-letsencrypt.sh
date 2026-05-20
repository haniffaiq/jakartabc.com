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
