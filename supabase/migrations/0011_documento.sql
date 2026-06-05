-- ============================================================
-- 0011 — Document metadata. Actual files live in the private
--        Storage bucket "documentos"; this table holds the
--        per-tenant, per-entity index + access control.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.documento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  entidad         TEXT NOT NULL CHECK (entidad IN ('empresa', 'contacto', 'oportunidad')),
  entity_id       UUID NOT NULL,
  nombre          TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  tamano_bytes    BIGINT,
  tipo_mime       TEXT,
  subido_por      UUID REFERENCES public.usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documento_entity
  ON public.documento (entidad, entity_id, creado_en DESC);

ALTER TABLE public.documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY documento_select ON public.documento
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY documento_insert ON public.documento
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY documento_delete ON public.documento
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());
