#!/usr/bin/env bash
# Nginx + Let's Encrypt wildcard para Turistea CRM
# Ejecutar DESPUÉS de lightsail-bootstrap.sh, cuando el DNS ya propagó.

set -euo pipefail

DOMAIN="turisteacrm.com"

echo "==> 1/5 Instalando certbot"
sudo apt install -y certbot python3-certbot-nginx

echo "==> 2/5 Config Nginx (proxy a Next en 3000, wildcard subdomain)"
sudo tee /etc/nginx/sites-available/turistea >/dev/null <<NGINX
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} *.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# HTTPS — turisteacrm.com y *.turisteacrm.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} *.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 30M;

    # Hardening de borde. HSTS fuerza HTTPS en visitas posteriores (evita SSL
    # strip pese al redirect 301). El resto duplica la defensa de next.config
    # por si la app no los emite. server_tokens off oculta la versión de Nginx.
    server_tokens off;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static assets de Next (cache largo)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        expires 30d;
        access_log off;
    }

    # Resto → Next
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/turistea /etc/nginx/sites-enabled/turistea
sudo rm -f /etc/nginx/sites-enabled/default

echo "==> 3/5 Obteniendo certificado wildcard (Let's Encrypt — DNS challenge MANUAL)"
echo ""
echo "    Vas a tener que crear UN registro TXT en Cloudflare cuando certbot te lo pida."
echo "    Dejá esta terminal abierta y andá al panel de Cloudflare para crear el TXT que aparezca."
echo ""
read -p "Presioná Enter para continuar..."

# Sin Nginx levantado para validación; lo levantamos al final.
sudo systemctl stop nginx || true

sudo certbot certonly --manual \
  --preferred-challenges dns \
  --agree-tos \
  --email admin@${DOMAIN} \
  -d "${DOMAIN}" \
  -d "*.${DOMAIN}"

echo "==> 4/5 Levantando Nginx con SSL"
sudo nginx -t
sudo systemctl restart nginx

echo "==> 5/5 Hardening UFW"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

echo ""
echo "✓ Listo. Probá: curl -I https://${DOMAIN}/login"
echo ""
echo "RENOVACIÓN: el wildcard manual con certbot NO se auto-renueva por DNS challenge."
echo "Cada ~80 días tenés que correr:"
echo "  sudo certbot renew --manual --preferred-challenges dns"
echo ""
echo "(Más adelante migramos a Cloudflare DNS API plugin para auto-renew, te paso el config cuando quieras)"
