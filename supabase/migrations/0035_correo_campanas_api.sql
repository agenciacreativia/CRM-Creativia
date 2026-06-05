-- ============================================================
-- 0035 — Oleada 4: correos enviados/eventos, campañas, API keys,
--        reportes programados. Correo entrante (Gmail readonly)
--        + 2FA usan APIs externas y se gatean por env/Supabase.
-- ============================================================

-- ---------- Correo enviado (tracking de apertura / clic) ----------
CREATE TABLE IF NOT EXISTS public.correo_enviado (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  oportunidad_id UUID REFERENCES public.oportunidad(id) ON DELETE SET NULL,
  contacto_id    UUID REFERENCES public.contacto(id) ON DELETE SET NULL,
  campania_id    UUID,
  asunto         TEXT,
  destinatario   TEXT NOT NULL,
  enviado_por    UUID REFERENCES public.usuario(id),
  enviado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  abierto_en     TIMESTAMPTZ,
  click_en       TIMESTAMPTZ,
  aperturas      INTEGER NOT NULL DEFAULT 0,
  clicks         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_correo_tenant ON public.correo_enviado (tenant_id, enviado_en DESC);
CREATE INDEX IF NOT EXISTS idx_correo_oport ON public.correo_enviado (oportunidad_id);

ALTER TABLE public.correo_enviado ENABLE ROW LEVEL SECURITY;
CREATE POLICY correo_select ON public.correo_enviado FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY correo_write ON public.correo_enviado FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ---------- Campañas masivas ----------
CREATE TABLE IF NOT EXISTS public.campania (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  asunto         TEXT NOT NULL,
  cuerpo_html    TEXT NOT NULL,
  segmento       JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado         TEXT NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador', 'enviada', 'cancelada')),
  enviados       INTEGER NOT NULL DEFAULT 0,
  creada_por     UUID REFERENCES public.usuario(id),
  creada_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviada_en     TIMESTAMPTZ
);

ALTER TABLE public.campania ENABLE ROW LEVEL SECURITY;
CREATE POLICY campania_select ON public.campania FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY campania_write ON public.campania FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ---------- API keys (acceso a la API pública del CRM) ----------
CREATE TABLE IF NOT EXISTS public.api_key (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  prefijo         TEXT NOT NULL,     -- primeros 8 chars de la key, para mostrar
  hash            TEXT NOT NULL,     -- sha256 hex de la key completa
  creada_por      UUID REFERENCES public.usuario(id),
  creada_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso      TIMESTAMPTZ,
  revocada        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_api_key_hash ON public.api_key (hash);

ALTER TABLE public.api_key ENABLE ROW LEVEL SECURITY;
CREATE POLICY apikey_select ON public.api_key FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());
CREATE POLICY apikey_write ON public.api_key FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ---------- Webhooks salientes ----------
CREATE TABLE IF NOT EXISTS public.webhook (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  url           TEXT NOT NULL,
  eventos       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  secret        TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_envio  TIMESTAMPTZ,
  ultimo_estado INTEGER,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_select ON public.webhook FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());
CREATE POLICY webhook_write ON public.webhook FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ---------- Reportes programados ----------
CREATE TABLE IF NOT EXISTS public.reporte_programado (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  destinatarios   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  frecuencia      TEXT NOT NULL DEFAULT 'semanal'
                  CHECK (frecuencia IN ('diario', 'semanal', 'mensual')),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_envio    TIMESTAMPTZ,
  proximo_envio   TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reporte_programado ENABLE ROW LEVEL SECURITY;
CREATE POLICY reporteprog_select ON public.reporte_programado FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());
CREATE POLICY reporteprog_write ON public.reporte_programado FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());
