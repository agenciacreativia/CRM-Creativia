-- ============================================================
-- 0027 — Wholesaler central catalog (Turistea's inventory).
--
--  producto_mayorista is OWNED BY THE PLATFORM (Turistea) and
--  SHARED across all agencies: any authenticated user can read it
--  (so agencies browse and resell it), but only the platform admin
--  can write it. precio_neto = wholesale price the agency pays
--  Turistea; agencies add their own markup when reselling.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.producto_mayorista (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  categoria    TEXT,
  destino      TEXT,
  duracion     TEXT,
  proveedor    TEXT,              -- operador / aerolínea
  descripcion  TEXT,
  incluye      TEXT,
  no_incluye   TEXT,
  precio_neto  NUMERIC(15, 2),    -- precio mayorista (Turistea → agencia)
  moneda       TEXT NOT NULL DEFAULT 'USD',
  cupo         INTEGER,           -- asientos/plazas disponibles (opcional)
  fecha_salida DATE,              -- para salidas con fecha (opcional)
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producto_mayorista_activo ON public.producto_mayorista (activo, categoria);

ALTER TABLE public.producto_mayorista ENABLE ROW LEVEL SECURITY;

-- Cualquier agencia autenticada puede VER el catálogo de Turistea.
CREATE POLICY producto_mayorista_select ON public.producto_mayorista
  FOR SELECT TO authenticated
  USING (TRUE);

-- Solo la plataforma (Turistea) puede crear/editar/borrar.
CREATE POLICY producto_mayorista_write ON public.producto_mayorista
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
