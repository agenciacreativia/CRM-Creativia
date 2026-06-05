-- ============================================================
-- 0018 — Custom roles with per-module CRUD permissions, plus
--        account invitations (invite-by-link flow).
--
--  · public.rol            — tenant-scoped roles. `permisos` is a
--                            JSONB map module -> {ver,crear,editar,eliminar}.
--                            `es_admin` roles map to the legacy text
--                            rol = 'admin' (full RLS access); others map
--                            to 'asesor'. `es_sistema` roles can't be
--                            deleted.
--  · usuario.rol_id        — links a user to a custom role.
--  · public.invitacion     — pending invites; accepted via a tokened
--                            public page that creates the account.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rol (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  es_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  es_sistema  BOOLEAN NOT NULL DEFAULT FALSE,
  permisos    JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nombre)
);

ALTER TABLE public.usuario
  ADD COLUMN IF NOT EXISTS rol_id UUID REFERENCES public.rol(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.invitacion (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  nombre       TEXT,
  rol_id       UUID REFERENCES public.rol(id) ON DELETE SET NULL,
  token        TEXT NOT NULL UNIQUE,
  estado       TEXT NOT NULL DEFAULT 'pendiente'
               CHECK (estado IN ('pendiente', 'aceptada', 'cancelada')),
  invitado_por UUID REFERENCES public.usuario(id) ON DELETE SET NULL,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  aceptada_en  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitacion_tenant ON public.invitacion (tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_rol_tenant ON public.rol (tenant_id);

-- ---- Seed system roles per tenant + backfill usuario.rol_id ----
DO $$
DECLARE
  t            RECORD;
  admin_perms  JSONB := '{"dashboard":{"ver":true,"crear":true,"editar":true,"eliminar":true},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":true},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":true},"productos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":true}}'::jsonb;
  asesor_perms JSONB := '{"dashboard":{"ver":true,"crear":false,"editar":false,"eliminar":false},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":false},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":false},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":false},"productos":{"ver":true,"crear":false,"editar":false,"eliminar":false},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":false}}'::jsonb;
BEGIN
  FOR t IN SELECT id FROM public.tenant LOOP
    INSERT INTO public.rol (tenant_id, nombre, descripcion, es_admin, es_sistema, permisos)
    VALUES (t.id, 'Administrador', 'Acceso total al sistema', TRUE, TRUE, admin_perms)
    ON CONFLICT (tenant_id, nombre) DO NOTHING;

    INSERT INTO public.rol (tenant_id, nombre, descripcion, es_admin, es_sistema, permisos)
    VALUES (t.id, 'Asesor', 'Acceso comercial estándar', FALSE, TRUE, asesor_perms)
    ON CONFLICT (tenant_id, nombre) DO NOTHING;

    UPDATE public.usuario u
       SET rol_id = (SELECT id FROM public.rol WHERE tenant_id = t.id AND nombre = 'Administrador')
     WHERE u.tenant_id = t.id AND u.rol = 'admin' AND u.rol_id IS NULL;

    UPDATE public.usuario u
       SET rol_id = (SELECT id FROM public.rol WHERE tenant_id = t.id AND nombre = 'Asesor')
     WHERE u.tenant_id = t.id AND u.rol = 'asesor' AND u.rol_id IS NULL;
  END LOOP;
END $$;

-- ---- RLS ----
ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;

CREATE POLICY rol_select ON public.rol
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY rol_write ON public.rol
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

ALTER TABLE public.invitacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitacion_select ON public.invitacion
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY invitacion_write ON public.invitacion
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());
