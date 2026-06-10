#!/usr/bin/env bash
# Nginx + Let's Encrypt wildcard para Turistea CRM
# Ejecutar DESPUÉS de lightsail-bootstrap.sh, cuando el DNS ya propagó.

set -euo pipefail

DOMAIN="turisteacrm.com"

echo "==> 1/5 Instalando certbot"
sudo apt install -y certbot python3-certbot-nginx

# Snippets SSL que la config referencia. Normalmente los crea el plugin nginx
# de certbot, PERO si el cert se obtuvo por DNS-challenge manual (como acá),
# no se generan y nginx falla con "options-ssl-nginx.conf: No such file".
# Los creamos si faltan para que la config siempre valide.
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  echo "==> Creando options-ssl-nginx.conf (faltaba)"
  sudo tee /etc/letsencrypt/options-ssl-nginx.conf >/dev/null <<'SSLOPTS'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
SSLOPTS
fi
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  echo "==> Creando ssl-dhparams.pem (faltaba)"
  sudo curl -fsSL https://ssl-config.mozilla.org/ffdhe2048.txt -o /etc/letsencrypt/ssl-dhparams.pem \
    || sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

# Zonas de rate limiting (contexto http, archivo aparte en conf.d).
# NOTA: el login del CRM va directo a Supabase Auth desde el browser, NO pasa
# por este Nginx — la fuerza bruta de credenciales la limita Supabase. Estas
# zonas protegen lo que SÍ pasa por el server: API pública (brute force de
# API keys), captura de leads (spam) y tráfico general (scraping/DoS).
echo "==> 2/5 Config rate limiting + Nginx (proxy a Next en 3000)"
sudo tee /etc/nginx/conf.d/turistea-ratelimit.conf >/dev/null <<'RATELIMIT'
# req/seg por IP. burst absorbe ráfagas legítimas; nodelay aplica el límite ya.
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=leads_limit:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
limit_req_status 429;
RATELIMIT

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

    # Static assets de Next (cache largo) — sin rate limit.
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        expires 30d;
        access_log off;
    }

    # Captura pública de leads — el más estricto (anti-spam de formularios).
    location /api/leads/ {
        limit_req zone=leads_limit burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }

    # API pública (v1 + public) — frena fuerza bruta de API keys y abuso.
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_read_timeout 60s;
    }

    # Resto → Next (límite general holgado contra scraping/DoS).
    location / {
        limit_req zone=general_limit burst=60 nodelay;
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
