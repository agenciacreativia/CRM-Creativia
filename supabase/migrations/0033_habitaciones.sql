-- ============================================================
-- 0033 — Rooms (accommodations) per opportunity. Passengers are
--        distributed into rooms; counts per type are sent to the
--        Turistea website (acom_sencilla/doble/triple_cant).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habitacion (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL DEFAULT 'doble' CHECK (tipo IN ('sencilla', 'doble', 'triple')),
  orden          INTEGER NOT NULL DEFAULT 1,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pasajero
  ADD COLUMN IF NOT EXISTS habitacion_id UUID REFERENCES public.habitacion(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_habitacion_oportunidad ON public.habitacion (oportunidad_id, orden);

ALTER TABLE public.habitacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY habitacion_select ON public.habitacion
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY habitacion_write ON public.habitacion
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
