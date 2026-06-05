-- ============================================================
-- 0034 — Commercial strategy attribution, territorial plan, NPS.
--
--  · Estrategia ya quedó en oportunidad.estrategia (0032).
--  · territorio       — catálogo del tenant (zona + meta).
--  · usuario.territorio_id — vendedor externo asignado a una zona.
--  · nps_respuesta    — encuestas post-viaje (de un contacto/oportunidad).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.territorio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  meta        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  moneda      TEXT NOT NULL DEFAULT 'USD',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);

ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS territorio_id UUID REFERENCES public.territorio(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.nps_respuesta (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id  UUID REFERENCES public.oportunidad(id) ON DELETE SET NULL,
  contacto_id     UUID REFERENCES public.contacto(id) ON DELETE SET NULL,
  token           TEXT NOT NULL UNIQUE,
  puntaje         INTEGER CHECK (puntaje BETWEEN 0 AND 10),
  comentario      TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'respondida')),
  enviado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondido_en   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nps_tenant ON public.nps_respuesta (tenant_id, estado);

ALTER TABLE public.territorio ENABLE ROW LEVEL SECURITY;
CREATE POLICY territorio_select ON public.territorio FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY territorio_write ON public.territorio FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

ALTER TABLE public.nps_respuesta ENABLE ROW LEVEL SECURITY;
CREATE POLICY nps_select ON public.nps_respuesta FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY nps_write ON public.nps_respuesta FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
