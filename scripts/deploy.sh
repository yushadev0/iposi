#!/usr/bin/env bash
#
# Redeploy Iposi: pull the latest code, rebuild, publish the web client and the
# API, then restart the systemd service and wait for the health check.
#
# Usage:
#   scripts/deploy.sh [--no-pull] [--no-build]
#
#   --no-pull    deploy the current working tree, skip "git pull"
#   --no-build   skip "npm ci && npm run build" (reuse existing dist/)
#
# Paths and names can be overridden with environment variables:
#   IPOSI_WEB_ROOT    (default /var/www/iposi)
#   IPOSI_API_DIR     (default /opt/iposi-api)
#   IPOSI_SERVICE     (default iposi-api)
#   IPOSI_HEALTH_URL  (default http://127.0.0.1:3001/api/health)
#
# Run as a normal user; privileged steps use sudo. First-time setup (creating
# .env, the systemd unit and the nginx block) is in DEPLOYMENT.md.

set -euo pipefail

WEB_ROOT="${IPOSI_WEB_ROOT:-/var/www/iposi}"
API_DIR="${IPOSI_API_DIR:-/opt/iposi-api}"
SERVICE="${IPOSI_SERVICE:-iposi-api}"
HEALTH_URL="${IPOSI_HEALTH_URL:-http://127.0.0.1:3001/api/health}"

PULL=1
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --no-pull)  PULL=0 ;;
    --no-build) BUILD=0 ;;
    -h|--help)  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR"

SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

log()  { printf '\n\033[1;36m> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mx %s\033[0m\n' "$*" >&2; exit 1; }

command -v git   >/dev/null || fail "git not found"
command -v npm   >/dev/null || fail "npm not found"
command -v rsync >/dev/null || fail "rsync not found"

if [ "$PULL" -eq 1 ]; then
  log "git pull --ff-only"
  git pull --ff-only || fail "pull failed (diverged history? see DEPLOYMENT.md)"
fi

REV="$(git rev-parse --short HEAD)"

if [ "$BUILD" -eq 1 ]; then
  log "build API"
  ( cd server && npm ci && npm run build )
  log "build web client"
  ( cd client && npm ci && npm run build )
fi

[ -d client/dist ] || fail "client/dist missing - run without --no-build"
[ -d server/dist ] || fail "server/dist missing - run without --no-build"

log "publish web client -> $WEB_ROOT"
$SUDO mkdir -p "$WEB_ROOT"
$SUDO rsync -a --delete client/dist/ "$WEB_ROOT/"
$SUDO chown -R www-data:www-data "$WEB_ROOT"

log "publish API -> $API_DIR"
$SUDO mkdir -p "$API_DIR/dist"
$SUDO rsync -a --delete server/dist/ "$API_DIR/dist/"
$SUDO cp server/package.json server/package-lock.json "$API_DIR/"
( cd "$API_DIR" && $SUDO npm ci --omit=dev )
$SUDO chown -R www-data:www-data "$API_DIR"

log "restart $SERVICE"
$SUDO systemctl restart "$SERVICE"

log "health check ($HEALTH_URL)"
for _ in $(seq 1 15); do
  if out="$(curl -fsS "$HEALTH_URL" 2>/dev/null)"; then
    echo "$out"
    printf '\n\033[1;32m* deployed %s\033[0m\n' "$REV"
    exit 0
  fi
  sleep 1
done

printf '\n\033[1;31mx health check did not pass\033[0m\n' >&2
$SUDO systemctl status "$SERVICE" --no-pager || true
$SUDO journalctl -u "$SERVICE" -n 30 --no-pager || true
exit 1
