#!/bin/bash
# Usage: bash scripts/deploy.sh
# Builds the site for Cloudflare Workers and deploys it. Needs .env with CF_ACCOUNT_ID, CF_API_TOKEN, D1_DATABASE_ID
# (the build reads the real database to prerender pages) and CLOUDFLARE_DEPLOY_TOKEN (a token allowed to deploy Workers).
#
# Two traps this script avoids:
#  1. OpenNext copies every value in .env / .env.local into the Worker's code. The files are set aside during the build
#     and the values the build needs are passed as shell variables instead, which are not copied. The bundle is then
#     searched for each secret before anything is uploaded.
#  2. Next keeps database answers from earlier builds in .next/cache, so a rebuild can bake in old data. It is cleared first.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; . ./.env; set +a
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_DEPLOY_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

backup=$(mktemp -d)
cp .env "$backup/.env"; [ -f .env.local ] && cp .env.local "$backup/.env.local" || true
restore() { cp "$backup/.env" .env; [ -f "$backup/.env.local" ] && cp "$backup/.env.local" .env.local || true; rm -rf "$backup"; }
trap restore EXIT

rm -f .env .env.local
rm -rf .next/cache .open-next
# fetching Google Fonts right after the cache is cleared sometimes fails once; a retry (without clearing again) works
for attempt in 1 2 3; do
  npx opennextjs-cloudflare build && break
  [ "$attempt" = 3 ] && exit 1
  echo "Build failed, retrying (attempt $((attempt + 1)) of 3)..."
done

for name in CF_API_TOKEN R2_SECRET_ACCESS_KEY R2_ACCESS_KEY_ID ADMIN_PASSWORD SESSION_SECRET CLOUDFLARE_DEPLOY_TOKEN; do
  value="${!name:-}"
  if [ -n "$value" ] && grep -rlF -- "$value" .open-next >/dev/null; then
    echo "STOP: the value of $name is inside the build output; not deploying." >&2
    exit 1
  fi
done

npx wrangler deploy

# Every deploy starts with an empty page cache, and on Cloudflare's free plan a page rendered from scratch sometimes fails
# (error 1102). Open the home page, categories and newest articles once, repeating any that fail, so visitors get cached pages.
# Skip with WARM=0 bash scripts/deploy.sh
if [ "${WARM:-1}" = 1 ]; then
  node scripts/warm-cache.mjs https://theecho.d4dx-fatwa.workers.dev 150 || true
fi
