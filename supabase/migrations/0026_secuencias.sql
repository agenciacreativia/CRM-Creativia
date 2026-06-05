-- ============================================================
-- 0026 — Follow-up sequences (cadencias). A sequence is a template
--        of steps; enrolling an opportunity generates the dated
--        activities up front (no background worker needed).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.secuencia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  -- [{ actividad_tipo, dias, descripcion }]  (dias = offset desde la inscripción)
  pasos       JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secuencia_tenant ON public.secuencia (tenant_id);

ALTER TABLE public.secuencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY secuencia_select ON public.secuencia FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY secuencia_write ON public.secuencia FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());
