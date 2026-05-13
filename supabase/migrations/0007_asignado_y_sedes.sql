-- ============================================================
-- 0007_asignado_y_sedes.sql
-- Sprint 4.5:
--   1. Add `asignado_id` to empresa + contacto (independent of opportunity assignee)
--   2. New `sede` table for optional company branches/locations
-- ============================================================

-- ---------- 1. asignado_id on empresa + contacto ----------
ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS asignado_id UUID REFERENCES public.usuario(id) ON DELETE SET NULL;

ALTER TABLE public.contacto
  ADD COLUMN IF NOT EXISTS asignado_id UUID REFERENCES public.usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_empresa_asignado ON public.empresa(tenant_id, asignado_id);
CREATE INDEX IF NOT EXISTS idx_contacto_asignado ON public.contacto(tenant_id, asignado_id);

-- ---------- 2. Sede table ----------
CREATE TABLE IF NOT EXISTS public.sede (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  direccion       TEXT,
  ciudad          TEXT,
  pais            TEXT,
  telefono        TEXT,
  email           TEXT,
  es_principal    BOOLEAN NOT NULL DEFAULT FALSE,
  creado_por      UUID REFERENCES public.usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_sede_tenant ON public.sede(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sede_empresa ON public.sede(empresa_id);

DROP TRIGGER IF EXISTS trg_sede_updated_at ON public.sede;
CREATE TRIGGER trg_sede_updated_at
  BEFORE UPDATE ON public.sede
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- RLS for sede ----------
ALTER TABLE public.sede ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sede_select ON public.sede;
CREATE POLICY sede_select ON public.sede
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS sede_admin_write ON public.sede;
CREATE POLICY sede_admin_write ON public.sede
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());
