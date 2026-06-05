-- ============================================================
-- 0017 — Products attached to an opportunity (Pipedrive-style
--        deal products). Each row snapshots the name/price so it
--        survives catalog edits; producto_id keeps the link.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.oportunidad_producto (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id  UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES public.producto(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  cantidad        NUMERIC(15, 2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(15, 2) NOT NULL DEFAULT 0,
  moneda          TEXT NOT NULL DEFAULT 'USD',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oportunidad_producto_opp
  ON public.oportunidad_producto (oportunidad_id, creado_en);

ALTER TABLE public.oportunidad_producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY oportunidad_producto_select ON public.oportunidad_producto
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY oportunidad_producto_write ON public.oportunidad_producto
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
