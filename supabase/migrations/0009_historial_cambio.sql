-- ============================================================
-- 0009 — Generic change history (audit) for empresa / contacto /
--        oportunidad. Populated by the app when fields are edited
--        inline or records are created.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.historial_cambio (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  entidad       TEXT NOT NULL CHECK (entidad IN ('empresa', 'contacto', 'oportunidad')),
  entity_id     UUID NOT NULL,
  descripcion   TEXT NOT NULL,
  cambiado_por  UUID REFERENCES public.usuario(id),
  cambiado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_cambio_entity
  ON public.historial_cambio (entidad, entity_id, cambiado_en DESC);

ALTER TABLE public.historial_cambio ENABLE ROW LEVEL SECURITY;

CREATE POLICY historial_cambio_select ON public.historial_cambio
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY historial_cambio_insert ON public.historial_cambio
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());
