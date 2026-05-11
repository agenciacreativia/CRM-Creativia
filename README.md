# CRM Turistea

Multi-tenant CRM SaaS built with **Next.js 15 + Supabase + RLS**.

Each client company (tenant) accesses the app via its own subdomain
(`acme.crmturistea.com`). All data is isolated by Row Level Security: a user
from one tenant can never query data from another, even if the frontend has a
bug.

---

## Stack

| Layer        | Tech                                                   |
|--------------|--------------------------------------------------------|
| Framework    | Next.js 15 (App Router) + React 18 + TypeScript        |
| Database     | Supabase Cloud Postgres                                |
| Auth         | Supabase Auth + custom JWT claim (`tenant_id`, `rol`)  |
| Isolation    | RLS policies (`tenant_id = auth.jwt()->>'tenant_id'`)  |
| UI           | Tailwind CSS + custom components                       |
| Forms        | React Hook Form + Zod                                  |
| Custom fields| JSONB column + GIN index per entity                    |
| i18n         | react-i18next (ES + EN)                                |
| Hosting      | Vercel                                                 |

---

## Sprint roadmap

| Sprint | Focus                                                      |
|--------|------------------------------------------------------------|
| **1**  | Multi-tenant infra, auth, subdomain routing **(this one)** |
| 2      | CRUD Empresas + Contactos + Users + data migration from real source |
| 3      | Pipelines + Opportunities + Kanban                         |
| 4      | Custom fields + activities + notes + loss reasons          |
| 5      | Dashboards (admin + asesor) with charts                    |
| 6      | Export / Import + audit logs + UI polish                   |

---

## Local development setup

### 1. Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **npm 10+**
- **Supabase CLI**: `brew install supabase/tap/supabase`
- **Docker Desktop** (only if running Supabase locally; cloud project also works)

### 2. Clone & install

```bash
git clone <repo>
cd "CRM TURISTEA"
npm install
```

### 3. Create your Supabase Cloud project

> You can also run `supabase start` locally for fully-offline dev. The steps
> below assume Supabase Cloud.

1. Go to https://supabase.com/dashboard → **New project**
2. Choose region close to your users
3. Save the **database password** in a password manager
4. Wait ~2 minutes for provisioning
5. From **Settings → API** copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
   - JWT Secret (under JWT Settings) → `SUPABASE_JWT_SECRET`
6. From **Settings → Database → Connection string → URI** copy the
   *pooled* connection (port 6543) → `SUPABASE_DB_URL`

### 4. Configure local env

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase values
```

### 5. Link the Supabase CLI to your project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 6. Apply database migrations

```bash
supabase db push
```

This runs every `supabase/migrations/*.sql` in order:
1. `0001_init_tenants.sql` — tenant registry
2. `0002_init_entities.sql` — empresa, contacto, oportunidad, pipeline, etc.
3. `0003_rls_policies.sql` — RLS isolation per tenant + asesor own-data filter
4. `0004_auth_hooks.sql` — custom access token hook
5. `0005_seed_dev.sql` — two demo tenants (acme, globex) + default pipelines

### 7. Enable the Custom Access Token Hook in Supabase

In the Supabase dashboard:

1. **Auth → Hooks** → toggle on **Custom Access Token Hook**
2. Select function: `public.custom_access_token_hook`
3. Save

> ⚠️ Without this, JWTs won't contain `tenant_id` and **all RLS policies will
> reject requests**. This is intentional fail-closed behavior.

### 8. Create demo auth users

```bash
npm run seed --workspace=@crm/web
```

This creates the four demo users (printed at the end). Use them to log in:

```
admin@acme.test     / Acme1234!     (Acme · admin)
asesor@acme.test    / Acme1234!     (Acme · asesor)
admin@globex.test   / Globex1234!   (Globex · admin)
asesor@globex.test  / Globex1234!   (Globex · asesor)
```

### 9. Set up local subdomain DNS

The app expects subdomains like `acme.localhost:3000`. macOS/Linux
resolve `*.localhost` automatically. Windows needs `hosts` file edits:

```
127.0.0.1 acme.localhost
127.0.0.1 globex.localhost
```

### 10. Run the dev server

```bash
npm run dev
```

Then open:

- http://acme.localhost:3000 → login as `admin@acme.test`
- http://globex.localhost:3000 → login as `admin@globex.test`
- http://localhost:3000 → landing page (no tenant)

---

## Sprint 1 acceptance checklist

- [ ] `npm install` completes without errors
- [ ] `supabase db push` applies all migrations cleanly
- [ ] Custom Access Token Hook is enabled in Supabase Auth → Hooks
- [ ] `npm run seed -w @crm/web` creates the four demo users
- [ ] `acme.localhost:3000/login` shows "Acme Corp" under the title
- [ ] `globex.localhost:3000/login` shows "Globex Inc" under the title
- [ ] Logging in to acme as `admin@acme.test` redirects to dashboard with greeting
- [ ] Attempting to access `globex.localhost:3000/dashboard` while logged into acme → redirect to `/auth/error?reason=tenant_mismatch`
- [ ] ES/EN switcher in the header changes UI language and persists across refresh
- [ ] Visiting `localhost:3000` (no subdomain) shows the landing page

### Security test (run manually)

In SQL editor while logged in as an acme user (use Supabase impersonation):

```sql
-- Set JWT claims to simulate the acme admin
SELECT set_config('request.jwt.claims',
  '{"sub":"<acme-admin-uuid>","tenant_id":"11111111-1111-1111-1111-111111111111","rol":"admin"}',
  true);

-- Should return motivo_perdida rows belonging to Acme only
SELECT * FROM public.motivo_perdida;

-- Should return EMPTY (Globex tenant_id)
SELECT * FROM public.motivo_perdida
WHERE tenant_id = '22222222-2222-2222-2222-222222222222';
```

If the second query returns rows, **RLS is broken — stop and investigate before
moving to Sprint 2**.

---

## Repo structure

```
.
├── apps/
│   └── web/                          Next.js 15 app (only app for now)
│       ├── app/                      App Router pages + layouts
│       │   ├── (auth)/login/         Login page
│       │   ├── (app)/                Authenticated routes (dashboard, etc.)
│       │   ├── auth/callback/        OAuth callback (future)
│       │   └── landing/              Bare-domain landing
│       ├── components/               UI components
│       ├── lib/
│       │   ├── supabase/             Browser, server, admin, middleware clients
│       │   ├── tenant.ts             Subdomain → tenant resolver
│       │   ├── auth.ts               Session user reader
│       │   └── i18n/                 react-i18next config
│       └── middleware.ts             Subdomain + auth + cross-tenant guard
│
├── packages/
│   ├── shared/                       Zod schemas + TS types (cross-app)
│   └── i18n/                         ES + EN translation files
│
├── supabase/
│   ├── migrations/                   Versioned SQL (source of truth)
│   ├── seed.ts                       Demo auth users
│   └── config.toml                   Supabase local stack config
│
├── .env.example
├── package.json                      npm workspaces root
└── tsconfig.base.json
```

---

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import to Vercel → set root directory to `apps/web`
3. Add env vars (same as `.env.local`, with `NEXT_PUBLIC_BASE_DOMAIN=crmturistea.com`)
4. Add a wildcard domain `*.crmturistea.com` in Vercel → Domains
5. Point your DNS:
   ```
   *.crmturistea.com  CNAME  cname.vercel-dns.com
   crmturistea.com    A      76.76.21.21
   ```
6. SSL is automatic (Let's Encrypt wildcard cert)

---

## Onboarding a new client (tenant)

```sql
-- 1. Create tenant
INSERT INTO public.tenant (nombre_empresa, subdominio, plan, admin_email)
VALUES ('Cliente XYZ', 'cliente-xyz', 'professional', 'owner@cliente-xyz.com')
RETURNING id;

-- 2. Create default pipeline + stages for that tenant
--    (see supabase/migrations/0005_seed_dev.sql for the pattern)

-- 3. Provision the admin user via Supabase Auth dashboard, then:
INSERT INTO public.usuario (id, tenant_id, nombre, email, rol)
VALUES ('<auth-user-id>', '<tenant-id>', 'Owner Name', 'owner@cliente-xyz.com', 'admin');
```

A self-service tenant provisioning UI is planned for Sprint 6.

---

## Common commands

```bash
npm run dev                   # Run web app
npm run build                 # Build production bundle
npm run typecheck             # Type-check all workspaces
npm run db:migrate            # supabase db push
npm run seed -w @crm/web      # Create demo auth users
```
