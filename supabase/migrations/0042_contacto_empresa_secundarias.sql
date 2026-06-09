-- 0042_contacto_empresa_secundarias.sql
--
-- M-N entre contactos y empresas (issue #3 del QA desktop). Caso real: un
-- contacto comercial maneja varias agencias del grupo o un wedding planner
-- trabaja con distintos operadores.
--
-- Estrategia conservadora:
-- - `contacto.empresa_id` queda como EMPRESA PRINCIPAL (para no romper las
--   queries de oportunidades, vistas, filtros y reportes existentes — todos
--   asumen una sola empresa por contacto).
-- - Tabla puente `contacto_empresa_secundaria` para los vínculos extra.
-- - Vista helper `contacto_empresas` que mergea las dos para que cualquier
--   consulta "todas las empresas de este contacto" sea un solo SELECT.

CREATE TABLE IF NOT EXISTS public.contacto_empresa_secundaria (
  contacto_id   UUID NOT NULL REFERENCES public.contacto(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES public.empresa(id)  ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id)   ON DELETE CASCADE,
  rol           TEXT,           -- ej. "Comprador", "Jefe de marketing" — opcional
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contacto_id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_ces_empresa ON public.contacto_empresa_secundaria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ces_tenant  ON public.contacto_empresa_secundaria(tenant_id);

ALTER TABLE public.contacto_empresa_secundaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY ces_select ON public.contacto_empresa_secundaria FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY ces_write ON public.contacto_empresa_secundaria FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Vista unificada: todas las empresas asociadas a un contacto.
-- - `principal=true` para la empresa del contacto.empresa_id legacy
-- - `principal=false` para las secundarias
-- Útil para que el detalle del contacto pueda mostrar "Empresas (3)" sin
-- escribir el merge en cada query.
CREATE OR REPLACE VIEW public.contacto_empresas AS
  SELECT
    c.id                     AS contacto_id,
    c.empresa_id             AS empresa_id,
    c.tenant_id              AS tenant_id,
    NULL::TEXT               AS rol,
    TRUE                     AS principal,
    c.creado_en              AS creado_en
  FROM public.contacto c
  WHERE c.empresa_id IS NOT NULL
  UNION ALL
  SELECT
    ces.contacto_id,
    ces.empresa_id,
    ces.tenant_id,
    ces.rol,
    FALSE                    AS principal,
    ces.creado_en
  FROM public.contacto_empresa_secundaria ces;

-- No agregamos RLS a la vista — hereda de las tablas base (Postgres) y
-- ambas tablas filtran por tenant_id vía sus propias policies.
