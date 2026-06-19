# Deploy con Docker + auto-sync (CI)

Reemplaza el flujo pm2 por contenedor, para que **prod corra la misma imagen
que local** (misma versión de Node, mismas deps) y elimina el "funciona en local,
falla en prod". El push a `main` redepliega solo (ver `.github/workflows/deploy.yml`).

## Setup del servidor (una sola vez)

```bash
ssh ubuntu@<IP>

# 1) Instalar Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER        # re-login para que tome el grupo

# 2) Variables de entorno de runtime (NO se commitea)
cd ~/CRM-Creativia
cp .env.docker.example .env
nano .env                            # pegar claves reales

# 3) Levantar
docker compose up -d --build
docker compose ps                    # debe quedar healthy en :3000
```

Nginx sigue igual: hace reverse-proxy a `localhost:3000`, que ahora es el
contenedor en vez de pm2. (Si pm2 estaba sirviendo en :3000, primero
`pm2 stop turistea-crm && pm2 delete turistea-crm` para liberar el puerto.)

## Cada push a main (automático)

El workflow de GitHub Actions:
1. **migrate** — `supabase db push` aplica las migraciones nuevas de
   `supabase/migrations/` al proyecto Cloud.
2. **deploy** — entra por SSH y corre `git reset --hard origin/main` +
   `docker compose up -d --build`.

No hay que correr nada a mano. Para forzarlo: pestaña **Actions → Deploy a
producción → Run workflow**.

## Comandos útiles

```bash
docker compose logs -f crm           # logs en vivo
docker compose restart crm           # reiniciar
docker compose up -d --build         # rebuild + restart manual
docker compose down                  # apagar
```

## Rollback

```bash
git reset --hard <commit-anterior>
docker compose up -d --build
```
