#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Server-side deploy script. Run this on the VPS (not your laptop).
#
# First-time setup:
#   cd ~/jmart && bash deploy.sh init
#
# Updating after a git push from your laptop:
#   cd ~/jmart && bash deploy.sh update
#
# Restart just one service after a code change:
#   cd ~/jmart && bash deploy.sh restart api
#   cd ~/jmart && bash deploy.sh restart admin
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.server.yml"
cmd="${1:-update}"

case "$cmd" in
  init)
    echo "▶ First-time setup"
    test -f apps/api/.env.server || { echo "✗ Missing apps/api/.env.server — copy from apps/api/.env.server.example and fill in secrets"; exit 1; }
    $COMPOSE pull || true
    $COMPOSE up -d --build
    echo "▶ Waiting for postgres to accept connections..."
    until $COMPOSE exec -T postgres pg_isready -U jmart_user >/dev/null 2>&1; do sleep 2; done
    echo "▶ Running database migrations"
    $COMPOSE exec -T api npx prisma migrate deploy
    echo "▶ Seeding base data (admin user + categories)"
    $COMPOSE exec -T api node dist/prisma/seed.js || $COMPOSE exec -T api npx ts-node prisma/seed.ts || true
    echo "✓ Done. Services running on:"
    echo "    API     → http://62.171.147.73:8100"
    echo "    Admin   → http://62.171.147.73:8102"
    echo "    Farmer  → http://62.171.147.73:8103"
    echo "    Driver  → http://62.171.147.73:8104"
    ;;

  update)
    echo "▶ Pulling latest code"
    git pull
    echo "▶ Rebuilding containers"
    $COMPOSE up -d --build
    echo "▶ Applying any new migrations"
    $COMPOSE exec -T api npx prisma migrate deploy || echo "(no migrations to apply)"
    echo "✓ Update complete"
    ;;

  restart)
    svc="${2:-}"
    test -n "$svc" || { echo "Usage: bash deploy.sh restart <api|admin|farmer|driver>"; exit 1; }
    echo "▶ Rebuilding & restarting $svc"
    $COMPOSE up -d --build "$svc"
    ;;

  logs)
    svc="${2:-api}"
    $COMPOSE logs -f --tail=100 "$svc"
    ;;

  status)
    $COMPOSE ps
    ;;

  stop)
    $COMPOSE stop
    echo "✓ Stopped (data preserved)"
    ;;

  down)
    echo "✗ This stops AND removes containers (volumes safe). Press Ctrl+C to abort, or Enter to continue."
    read -r
    $COMPOSE down
    ;;

  *)
    echo "Usage: bash deploy.sh [init|update|restart <svc>|logs <svc>|status|stop|down]"
    exit 1
    ;;
esac
