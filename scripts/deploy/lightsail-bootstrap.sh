#!/usr/bin/env bash
# Bootstrap idempotente para AWS Lightsail (Ubuntu 22.04) — Turistea CRM
# Ejecutar como ubuntu (no root). Re-correr es seguro.

set -euo pipefail

DOMAIN="turisteacrm.com"
REPO="https://github.com/agenciacreativia/CRM-Creativia.git"
APP_DIR="$HOME/CRM-Creativia"
WEB_DIR="$APP_DIR/apps/web"
NODE_MAJOR="22"

echo "==> 1/8 Actualizando paquetes base"
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl git nginx ufw build-essential fail2ban

# fail2ban: banea IPs tras intentos fallidos de SSH (protección de fuerza
# bruta del acceso al server). Jail de sshd con umbral conservador.
echo "==> Configurando fail2ban (SSH brute-force)"
sudo tee /etc/fail2ban/jail.local >/dev/null <<'F2B'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
F2B
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

echo "==> 2/8 Instalando Node.js ${NODE_MAJOR} LTS"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v${NODE_MAJOR}\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt install -y nodejs
fi
node -v
npm -v

echo "==> 3/8 Instalando pm2 global"
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "==> 4/8 Clonando o actualizando el repo"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  cd "$APP_DIR" && git fetch origin && git reset --hard origin/main
fi

echo "==> 5/8 Instalando dependencias"
cd "$APP_DIR"
npm install

echo "==> 6/8 Configurando .env.production.local"
if [ ! -f "$WEB_DIR/.env.production.local" ]; then
  cat > "$WEB_DIR/.env.production.local" <<EOF
# ⚠️  EDITAR ESTOS VALORES MANUALMENTE DESPUÉS DEL BOOTSTRAP
NEXT_PUBLIC_SUPABASE_URL=https://CAMBIAME.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CAMBIAME
SUPABASE_SERVICE_ROLE_KEY=CAMBIAME
BASE_DOMAIN=${DOMAIN}
ROOT_URL=https://${DOMAIN}
EOF
  echo "⚠️  Editá $WEB_DIR/.env.production.local con tus claves de Supabase ANTES de continuar"
  echo "    nano $WEB_DIR/.env.production.local"
  echo "    luego re-corré: bash $0"
  exit 1
fi

if grep -q "CAMBIAME" "$WEB_DIR/.env.production.local"; then
  echo "⚠️  .env.production.local todavía tiene placeholders 'CAMBIAME'. Editalo primero."
  exit 1
fi

echo "==> 7/8 Build de producción"
cd "$WEB_DIR"
npm run build

echo "==> 8/8 pm2: arrancar / reiniciar app"
if pm2 describe turistea-crm >/dev/null 2>&1; then
  pm2 restart turistea-crm --update-env
else
  pm2 start "npx next start -p 3000" --name turistea-crm --cwd "$WEB_DIR"
  pm2 save
  # Auto-start en reboots
  sudo env PATH="$PATH" pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true
fi
pm2 save

echo ""
echo "✓ App corriendo en http://127.0.0.1:3000"
echo "  Continuá con: bash $APP_DIR/scripts/deploy/lightsail-nginx-ssl.sh"
