# Security model — multi-tenant isolation

This document is the source of truth for how CRM Turistea isolates data
between tenants. Read it before changing anything in `supabase/migrations/`,
`apps/web/middleware.ts`, or `apps/web/lib/tenant.ts`.

## Threat model

We treat **every other tenant as untrusted**. A bug that lets tenant A's user
read tenant B's data is a P0 incident.

We protect against:

- A buggy frontend that calls an API with the wrong `tenant_id`
- A user who modifies their cookies/JWT manually
- A user who visits a subdomain they don't have access to
- A leaked anon key being used by a third party

We do NOT protect against:

- A compromised `service_role` key (treat as full DB access — keep it in env
  vars only, never in code or client bundles)
- Postgres-level bugs (we trust Supabase)

## Defense in depth — five layers

### Layer 1 · Subdomain resolution (middleware)

`apps/web/middleware.ts` extracts the subdomain from `Host` and looks up
the tenant via the `service_role` (RLS-bypassing) admin client. If no
matching tenant exists → redirect to landing.

### Layer 2 · Session refresh + auth gating

The same middleware refreshes the Supabase session cookie and redirects
unauthenticated users to `/login`.

### Layer 3 · Cross-tenant JWT check

The user's JWT carries `app_metadata.tenant_id`. Middleware rejects any
request where `JWT.tenant_id !== subdomain.tenant_id`. This is the line
of defense against "logged into Acme, visits globex.crmturistea.com".

### Layer 4 · Postgres RLS

Every table has `ENABLE ROW LEVEL SECURITY` with a policy filtering by
`tenant_id = public.current_tenant_id()` where `current_tenant_id()` reads
the JWT claim. **This is the only layer that survives if all the above fail.**

If `tenant_id` is missing from the JWT (e.g., the auth hook isn't enabled),
`current_tenant_id()` returns NULL → all policies evaluate to false → no
rows visible. **Fail closed by design.**

### Layer 5 · Role-based row filtering

For `oportunidad` and `actividad`, an additional clause limits asesores to
their own records:

```sql
USING (
  tenant_id = public.current_tenant_id()
  AND (public.is_admin() OR asignado_id = auth.uid())
)
```

## Things that MUST stay true

1. **Every tenant-scoped table has a `tenant_id` column with RLS enabled.**
   Adding a table without RLS is a bug — CI should fail it.
2. **The `tenant` table is the only one with a public-read RLS policy.**
   It's a public lookup needed before auth.
3. **`SUPABASE_SERVICE_ROLE_KEY` is never imported into a client component.**
   The `lib/supabase/admin.ts` file uses `import "server-only"` to enforce this.
4. **The custom access token hook is enabled in production.**
   Without it, JWTs are empty of claims → everything is locked out (good!),
   but the app is also broken.

## What to do if you suspect a leak

1. Rotate `SUPABASE_SERVICE_ROLE_KEY` immediately
2. Check `backup_log` for unauthorized exports
3. Audit recent migrations for missing RLS or weakened policies
4. Run the cross-tenant query test in `README.md`

## Verifying isolation after a schema change

Run from Supabase SQL editor:

```sql
-- 1. Pretend to be Acme admin
SELECT set_config('request.jwt.claims',
  jsonb_build_object(
    'sub', (SELECT id FROM public.usuario WHERE email = 'admin@acme.test'),
    'tenant_id', '11111111-1111-1111-1111-111111111111',
    'rol', 'admin'
  )::text,
  true);

-- 2. Try to read Globex data → should be empty for ALL tables
SELECT 'empresa'         AS t, count(*) FROM public.empresa         WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'contacto',         count(*) FROM public.contacto         WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'oportunidad',      count(*) FROM public.oportunidad      WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'pipeline',         count(*) FROM public.pipeline         WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'etapa_pipeline',   count(*) FROM public.etapa_pipeline   WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'actividad',        count(*) FROM public.actividad        WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'nota',             count(*) FROM public.nota             WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'motivo_perdida',   count(*) FROM public.motivo_perdida   WHERE tenant_id <> public.current_tenant_id()
UNION ALL SELECT 'campo_personalizado', count(*) FROM public.campo_personalizado WHERE tenant_id <> public.current_tenant_id()
;
-- Every row must show count = 0
```
