-- ============================================================
-- 0024 — Tags (etiquetas) and saved views (vistas guardadas).
--
--  · etiqueta              — tenant tag catalog (name + color).
--  · {entidad}_etiqueta    — pivots for empresa / contacto / oportunidad.
--  · vista_guardada        — per-user saved list filters (URL query).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.etiqueta (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT 'gray',
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);

CREATE TABLE IF NOT EXISTS public.oportunidad_etiqueta (
  oportunidad_id UUID NOT NULL REFERENCES public.oportunidad(id) ON DELETE CASCADE,
  etiqueta_id    UUID NOT NULL REFERENCES public.etiqueta(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  PRIMARY KEY (oportunidad_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS public.contacto_etiqueta (
  contacto_id UUID NOT NULL REFERENCES public.contacto(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES public.etiqueta(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  PRIMARY KEY (contacto_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS public.empresa_etiqueta (
  empresa_id  UUID NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES public.etiqueta(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  PRIMARY KEY (empresa_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS public.vista_guardada (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  entidad    TEXT NOT NULL CHECK (entidad IN ('oportunidades', 'contactos', 'empresas')),
  nombre     TEXT NOT NULL,
  query      TEXT NOT NULL DEFAULT '',
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opp_etiqueta_tenant ON public.oportunidad_etiqueta (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacto_etiqueta_tenant ON public.contacto_etiqueta (tenant_id);
CREATE INDEX IF NOT EXISTS idx_empresa_etiqueta_tenant ON public.empresa_etiqueta (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vista_usuario ON public.vista_guardada (usuario_id, entidad);

-- ---- RLS ----
ALTER TABLE public.etiqueta ENABLE ROW LEVEL SECURITY;
CREATE POLICY etiqueta_select ON public.etiqueta FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY etiqueta_write ON public.etiqueta FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE public.oportunidad_etiqueta ENABLE ROW LEVEL SECURITY;
CREATE POLICY opp_etiqueta_all ON public.oportunidad_etiqueta FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE public.contacto_etiqueta ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacto_etiqueta_all ON public.contacto_etiqueta FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE public.empresa_etiqueta ENABLE ROW LEVEL SECURITY;
CREATE POLICY empresa_etiqueta_all ON public.empresa_etiqueta FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE public.vista_guardada ENABLE ROW LEVEL SECURITY;
CREATE POLICY vista_select ON public.vista_guardada FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND usuario_id = auth.uid());
CREATE POLICY vista_write ON public.vista_guardada FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND usuario_id = auth.uid())
  WITH CHECK (tenant_id = public.current_tenant_id() AND usuario_id = auth.uid());
