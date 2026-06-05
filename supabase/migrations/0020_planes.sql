-- ============================================================
-- 0020 — Platform plans / licenses.
--
--  The "principal" CRM (the platform owner) defines plans. Each
--  plan declares which MODULES + CRUD actions and which TOOLS
--  (feature flags) a client CRM gets. Tenants link to a plan via
--  tenant.plan_id; that becomes the ceiling of what their roles
--  can grant.
--
--  · tenant.es_plataforma  — marks the platform-owner tenant whose
--                            admins may manage plans.
--  · tenant.plan_id        — the plan a tenant is subscribed to.
--  · public.plan           — global catalog (NOT tenant-scoped).
--  · is_platform_admin()   — admin of the platform tenant.
-- ============================================================

ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS es_plataforma BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.plan (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  precio        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  moneda        TEXT NOT NULL DEFAULT 'USD',
  periodicidad  TEXT NOT NULL DEFAULT 'mensual'
                CHECK (periodicidad IN ('mensual', 'anual', 'unico')),
  -- module -> { ver, crear, editar, eliminar }
  modulos       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- feature flag -> boolean
  herramientas  JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { max_usuarios, max_contactos, ... } (null = ilimitado)
  limites       JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  orden         INTEGER NOT NULL DEFAULT 0,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plan(id) ON DELETE SET NULL;

-- Mark the platform-owner tenant (this principal CRM).
UPDATE public.tenant SET es_plataforma = TRUE WHERE subdominio = 'creativia';

-- ---- Security helper: admin of the platform tenant ----
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.is_admin() AND EXISTS (
      SELECT 1
        FROM public.usuario u
        JOIN public.tenant t ON t.id = u.tenant_id
       WHERE u.id = auth.uid() AND t.es_plataforma
    ),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ---- RLS ----
ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read plans (a client CRM reads its own plan).
CREATE POLICY plan_select ON public.plan
  FOR SELECT TO authenticated
  USING (TRUE);

-- Only platform admins manage the catalog.
CREATE POLICY plan_write ON public.plan
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---- Seed Lite / Premium / Ultimate (only if catalog is empty) ----
DO $seed$
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.plan) THEN
INSERT INTO public.plan (nombre, descripcion, precio, periodicidad, orden, modulos, herramientas, limites)
VALUES
(
  'Lite', 'Para agencias que arrancan: gestión esencial de clientes y oportunidades.', 29, 'mensual', 1,
  '{"dashboard":{"ver":true,"crear":false,"editar":false,"eliminar":false},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":false},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":false},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":false},"productos":{"ver":false,"crear":false,"editar":false,"eliminar":false},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":false}}'::jsonb,
  '{"google_integracion":false,"plantillas_correo":false,"cotizaciones":false,"productos":false,"productos_oportunidad":false,"documentos":false,"roles_permisos":false,"campos_personalizados":false,"multiples_pipelines":false,"importar_datos":false,"exportar_datos":false,"calendar_sync":false,"meet":false}'::jsonb,
  '{"max_usuarios":3,"max_contactos":1000}'::jsonb
),
(
  'Premium', 'Para equipos en crecimiento: correo, cotizaciones y catálogo de productos.', 79, 'mensual', 2,
  '{"dashboard":{"ver":true,"crear":false,"editar":false,"eliminar":false},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":true},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":true},"productos":{"ver":true,"crear":true,"editar":true,"eliminar":false},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":true}}'::jsonb,
  '{"google_integracion":true,"plantillas_correo":true,"cotizaciones":true,"productos":true,"productos_oportunidad":true,"documentos":true,"roles_permisos":false,"campos_personalizados":true,"multiples_pipelines":false,"importar_datos":true,"exportar_datos":true,"calendar_sync":true,"meet":true}'::jsonb,
  '{"max_usuarios":10,"max_contactos":10000}'::jsonb
),
(
  'Ultimate', 'Para operaciones completas: todo incluido, roles y sin límites.', 149, 'mensual', 3,
  '{"dashboard":{"ver":true,"crear":true,"editar":true,"eliminar":true},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":true},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":true},"productos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":true}}'::jsonb,
  '{"google_integracion":true,"plantillas_correo":true,"cotizaciones":true,"productos":true,"productos_oportunidad":true,"documentos":true,"roles_permisos":true,"campos_personalizados":true,"multiples_pipelines":true,"importar_datos":true,"exportar_datos":true,"calendar_sync":true,"meet":true}'::jsonb,
  '{"max_usuarios":null,"max_contactos":null}'::jsonb
);
END IF;
END $seed$;
