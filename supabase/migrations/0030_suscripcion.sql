-- ============================================================
-- 0030 — Billing / Stripe scaffold. One subscription row per
--        agency (tenant). The Stripe IDs + status are filled in
--        once Stripe is connected (post-launch); for now this
--        powers the Facturación panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suscripcion (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL UNIQUE REFERENCES public.tenant(id) ON DELETE CASCADE,
  plan_id                UUID REFERENCES public.plan(id),
  estado                 TEXT NOT NULL DEFAULT 'trial'
                         CHECK (estado IN ('trial', 'activa', 'morosa', 'cancelada', 'sin_suscripcion')),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  periodo_fin            TIMESTAMPTZ,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suscripcion_estado ON public.suscripcion (estado);

ALTER TABLE public.suscripcion ENABLE ROW LEVEL SECURITY;

-- La agencia ve su propia suscripción; la plataforma ve/gestiona todas.
CREATE POLICY suscripcion_select ON public.suscripcion
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_platform_admin());

CREATE POLICY suscripcion_write ON public.suscripcion
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
