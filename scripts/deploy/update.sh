#!/usr/bin/env bash
# Update rápido — pull, install, rebuild, restart.
# Correr en la instancia cada vez que querés sincronizar con main.

set -euo pipefail

APP_DIR="$HOME/CRM-Creativia"
WEB_DIR="$APP_DIR/apps/web"

cd "$APP_DIR"
echo "==> git pull"
git fetch origin
git reset --hard origin/main

echo "==> npm install"
npm install

echo "==> next build"
cd "$WEB_DIR"
npm run build

echo "==> pm2 restart"
pm2 restart turistea-crm --update-env

echo ""
echo "✓ Update terminado."
pm2 status turistea-crm
