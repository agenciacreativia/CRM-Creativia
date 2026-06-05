-- ============================================================
-- 0016 — Quotes (cotizaciones) per opportunity. Line items are
--        stored as JSONB; each item may reference a producto.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cotizacion (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  titulo         TEXT NOT NULL DEFAULT 'Cotización',
  moneda         TEXT NOT NULL DEFAULT 'USD',
  descuento      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notas          TEXT,
  validez_dias   INTEGER NOT NULL DEFAULT 15,
  estado         TEXT NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador', 'enviada', 'aceptada', 'rechazada')),
  -- [{ producto_id?, nombre, descripcion?, cantidad, precio_unitario }]
  items          JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_por     UUID REFERENCES public.usuario(id),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_oportunidad
  ON public.cotizacion (oportunidad_id, creado_en DESC);

ALTER TABLE public.cotizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotizacion_select ON public.cotizacion
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY cotizacion_write ON public.cotizacion
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
