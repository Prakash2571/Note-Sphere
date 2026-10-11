#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="notesphere"
DOMAIN="notesphere.fun"
BRANCH="main"
SETUP_NGINX=0
case "${1:-}" in
  "") ;;
  --setup-nginx) SETUP_NGINX=1 ;;
  *) printf 'Usage: %s [--setup-nginx]\n' "$0" >&2; exit 1 ;;
esac
NGINX_SOURCE="$APP_DIR/deploy/notesphere.fun.nginx.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"

die() {
  printf 'Deployment failed: %s\n' "$*" >&2
  exit 1
}

for command in git node npm pm2 curl; do
  command -v "$command" >/dev/null 2>&1 || die "Missing required command: $command"
done

[[ "$(id -u)" -ne 0 ]] || die "Run this as the app user, not root, so PM2 uses the right account."
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 22 && minor >= 12) || major === 24 || major >= 26 ? 0 : 1)' \
  || die "Use Node.js 24 LTS (or Node.js 22.12+) for the app and deployment checks."

cd "$APP_DIR"
[[ "$(git rev-parse --is-inside-work-tree 2>/dev/null)" == "true" ]] || die "This directory is not a Git checkout."
[[ "$(git branch --show-current)" == "$BRANCH" ]] || die "Check out the $BRANCH branch first."
[[ -z "$(git status --porcelain --untracked-files=normal)" ]] || die "Commit, stash, or remove local changes before deploying."
[[ -f package-lock.json ]] || die "package-lock.json is missing."
[[ -f "$NGINX_SOURCE" ]] || die "Nginx template is missing."

printf 'Pulling %s...\n' "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ ! -f .env.production.local && ! -f .env.local && ! -f .env ]]; then
  die "Create .env.production.local from .env.example and fill in production values before deploying."
fi

# Only initial proxy setup needs administrator access. An unchanged Nginx
# configuration keeps proxying to port 3000 across application restarts.
if [[ "$SETUP_NGINX" -eq 1 ]]; then
  command -v sudo >/dev/null 2>&1 || die "Missing required command: sudo"
  sudo -v
  sudo nginx -t
else
  [[ -f "$NGINX_AVAILABLE" && -e "$NGINX_ENABLED" ]] \
    || die "Nginx site is missing. Run ./start.sh --setup-nginx once."
fi
printf 'Installing dependencies and building...\n'
npm ci
npm run lint
npm test
npm run build

printf 'Starting or reloading %s with PM2...\n' "$APP_NAME"
pm2 startOrReload ecosystem.config.cjs
pm2 save

printf 'Waiting for the app on 127.0.0.1:3000...\n'
ready=0
for attempt in {1..30}; do
  if curl --noproxy '*' --fail --silent --show-error --max-time 3 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
[[ "$ready" -eq 1 ]] || die "The app did not respond on port 3000. Check: pm2 logs $APP_NAME --lines 100"

# Install the HTTP site once. Certbot may edit the installed copy later, so
# subsequent deployments must not overwrite it.
if [[ "$SETUP_NGINX" -eq 1 ]]; then
  if [[ ! -e "$NGINX_AVAILABLE" ]]; then
    sudo install -m 644 "$NGINX_SOURCE" "$NGINX_AVAILABLE"
  fi
  if [[ ! -e "$NGINX_ENABLED" && ! -L "$NGINX_ENABLED" ]]; then
    sudo ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  fi

  printf 'Validating and reloading Nginx...\n'
  sudo nginx -t
  sudo systemctl reload nginx
fi

# Resolve the domain to this machine to test Nginx before DNS propagates.
curl --noproxy '*' --fail --silent --show-error --location --max-time 15 \
  --resolve "$DOMAIN:80:127.0.0.1" \
  --resolve "$DOMAIN:443:127.0.0.1" \
  "http://$DOMAIN/" >/dev/null \
  || die "Nginx did not serve $DOMAIN locally. Check the site config and Nginx logs."

printf 'Deployment OK: PM2 is serving port 3000 and Nginx responds for %s.\n' "$DOMAIN"
