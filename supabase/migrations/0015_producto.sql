-- ============================================================
-- 0015 — Products / travel plans catalog (per tenant).
--        Reusable in quotes and attachable to emails.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.producto (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  categoria     TEXT,
  destino       TEXT,
  duracion      TEXT,
  precio_desde  NUMERIC(15, 2),
  moneda        TEXT NOT NULL DEFAULT 'USD',
  descripcion   TEXT,
  incluye       TEXT,
  no_incluye    TEXT,
  proveedor     TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  creado_por    UUID REFERENCES public.usuario(id),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producto_tenant ON public.producto (tenant_id, nombre);

ALTER TABLE public.producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY producto_select ON public.producto
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY producto_write ON public.producto
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
