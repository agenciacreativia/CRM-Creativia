# Deploy a AWS Lightsail

## Primer setup (una sola vez)

1. Crear instancia Ubuntu 22.04 en Lightsail.
2. IP estática + asignarla.
3. Cloudflare DNS:
   - A `@` → IP (DNS only)
   - A `*` → IP (DNS only)
4. SSH a la instancia.
5. Bootstrap:
   ```bash
   curl -sSL https://raw.githubusercontent.com/agenciacreativia/CRM-Creativia/main/scripts/deploy/lightsail-bootstrap.sh | bash
   ```
6. Editar `~/CRM-Creativia/apps/web/.env.production.local` con las claves de Supabase.
7. Re-correr el bootstrap (para el build con env vars reales):
   ```bash
   bash ~/CRM-Creativia/scripts/deploy/lightsail-bootstrap.sh
   ```
8. SSL + Nginx:
   ```bash
   bash ~/CRM-Creativia/scripts/deploy/lightsail-nginx-ssl.sh
   ```
   - Cuando pida el TXT record, lo crear en Cloudflare con la name+value que muestre.

## Updates posteriores (cada push a main)

```bash
ssh ubuntu@<IP>
bash ~/CRM-Creativia/scripts/deploy/update.sh
```

## Logs / debug

```bash
pm2 logs turistea-crm           # logs en vivo
pm2 status                       # estado del proceso
sudo journalctl -u nginx -f      # logs Nginx
sudo tail -f /var/log/nginx/error.log
```

## Reiniciar

```bash
pm2 restart turistea-crm         # solo la app Next
sudo systemctl reload nginx      # solo Nginx
sudo reboot                      # toda la instancia
```

## Variables de entorno mínimas

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BASE_DOMAIN=turisteacrm.com
ROOT_URL=https://turisteacrm.com
```

Añadir según necesidades:
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (integración Gmail)
- `CUPOS_SUPABASE_URL`, `CUPOS_SUPABASE_ANON_KEY` (catálogo externo)
