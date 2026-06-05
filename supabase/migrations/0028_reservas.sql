-- ============================================================
-- 0028 — B2B reservations (Phase 2). A reservation created in the
--        CRM is sent to the Turistea website via its crear_solicitud
--        RPC; we mirror it locally so the agency tracks the file,
--        milestones and payments inside its CRM.
--
--  · tenant.nit  — used to resolve the agency to the website's
--                  clientes (agencia_id) for crear_solicitud.
--  · reserva     — local mirror linked to the opportunity and the
--                  external solicitud_id.
-- ============================================================

ALTER TABLE public.tenant ADD COLUMN IF NOT EXISTS nit TEXT;

CREATE TABLE IF NOT EXISTS public.reserva (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id       UUID REFERENCES public.oportunidad(id) ON DELETE SET NULL,
  solicitud_externa_id TEXT,                 -- bloqueo_solicitudes.id del sitio
  bloqueo_id           TEXT,                 -- plan del sitio
  fecha_id             TEXT,                 -- salida del sitio
  plan_nombre          TEXT NOT NULL,
  salida_fecha         DATE,
  adultos              INTEGER NOT NULL DEFAULT 1,
  ninos                INTEGER NOT NULL DEFAULT 0,
  bebes                INTEGER NOT NULL DEFAULT 0,
  pasajeros            JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado               TEXT NOT NULL DEFAULT 'pendiente',
  monto                NUMERIC(15, 2),
  moneda               TEXT NOT NULL DEFAULT 'USD',
  creado_por           UUID REFERENCES public.usuario(id),
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_oportunidad ON public.reserva (oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_reserva_tenant ON public.reserva (tenant_id, creado_en DESC);

ALTER TABLE public.reserva ENABLE ROW LEVEL SECURITY;

-- La agencia ve sus reservas; la plataforma (Turistea) ve todas (panel mayorista).
CREATE POLICY reserva_select ON public.reserva
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY reserva_write ON public.reserva
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
