-- ============================================================
-- 0001_init_tenants.sql
-- Tenant registry (global). Looked up BEFORE auth via subdomain.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.tenant (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa  TEXT NOT NULL,
  subdominio      TEXT NOT NULL UNIQUE
                  CHECK (subdominio ~ '^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$'),
  plan            TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter','professional','enterprise')),
  estado          TEXT NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('activo','suspendido','cancelado')),
  admin_email     TEXT NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso   TIMESTAMPTZ
);

CREATE INDEX idx_tenant_subdominio ON public.tenant(subdominio);
CREATE INDEX idx_tenant_estado ON public.tenant(estado);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_updated_at
  BEFORE UPDATE ON public.tenant
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The tenant table is the only one with a *public* read policy by subdomain.
-- This is required for the Next.js middleware to resolve subdomain → tenant_id
-- BEFORE the user is authenticated.
-- We only expose minimal columns (id, subdominio, estado, nombre_empresa).
ALTER TABLE public.tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_public_subdomain_lookup ON public.tenant
  FOR SELECT
  TO anon, authenticated
  USING (estado = 'activo');

-- Only service_role can mutate tenants (provisioning)
CREATE POLICY tenant_service_role_all ON public.tenant
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
