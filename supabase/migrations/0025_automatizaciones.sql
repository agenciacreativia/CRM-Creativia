-- ============================================================
-- 0025 — Automation rules. When a CRM event fires (opportunity
--        created, stage entered, won, lost), matching active
--        rules run their actions (create activity, assign, tag).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.regla_automatizacion (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  evento     TEXT NOT NULL CHECK (evento IN ('oportunidad_creada', 'etapa_cambiada', 'oportunidad_ganada', 'oportunidad_perdida')),
  etapa_id   UUID REFERENCES public.etapa_pipeline(id) ON DELETE CASCADE,
  -- [{ tipo:'crear_actividad', actividad_tipo, dias, descripcion } | { tipo:'asignar', usuario_id } | { tipo:'etiquetar', etiqueta_id }]
  acciones   JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regla_tenant_evento ON public.regla_automatizacion (tenant_id, evento, activo);

ALTER TABLE public.regla_automatizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY regla_select ON public.regla_automatizacion FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY regla_write ON public.regla_automatizacion FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());
