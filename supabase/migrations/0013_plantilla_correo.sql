-- ============================================================
-- 0013 — Email templates (shared per tenant). Created from
--        Account Settings, selected when composing an email.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plantilla_correo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  asunto      TEXT NOT NULL DEFAULT '',
  cuerpo_html TEXT NOT NULL DEFAULT '',
  creado_por  UUID REFERENCES public.usuario(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantilla_correo_tenant
  ON public.plantilla_correo (tenant_id, nombre);

ALTER TABLE public.plantilla_correo ENABLE ROW LEVEL SECURITY;

-- Any member of the tenant can read and manage the tenant's templates.
CREATE POLICY plantilla_correo_select ON public.plantilla_correo
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY plantilla_correo_write ON public.plantilla_correo
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
