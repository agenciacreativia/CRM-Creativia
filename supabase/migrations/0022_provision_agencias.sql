-- ============================================================
-- 0022 — Agency (tenant) provisioning support.
--
--  · tenant.trial_termina_en  — when the free trial ends.
--  · seed_roles_tenant()      — AFTER INSERT on tenant auto-creates
--                               the two system roles (Administrador,
--                               Asesor) so every new agency has them
--                               (the 0018 seed only ran once).
-- ============================================================

ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS trial_termina_en TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.seed_roles_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rol (tenant_id, nombre, descripcion, es_admin, es_sistema, permisos)
  VALUES (
    NEW.id, 'Administrador', 'Acceso total al sistema', TRUE, TRUE,
    '{"dashboard":{"ver":true,"crear":true,"editar":true,"eliminar":true},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":true},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":true},"productos":{"ver":true,"crear":true,"editar":true,"eliminar":true},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":true}}'::jsonb
  )
  ON CONFLICT (tenant_id, nombre) DO NOTHING;

  INSERT INTO public.rol (tenant_id, nombre, descripcion, es_admin, es_sistema, permisos)
  VALUES (
    NEW.id, 'Asesor', 'Acceso comercial estándar', FALSE, TRUE,
    '{"dashboard":{"ver":true,"crear":false,"editar":false,"eliminar":false},"empresas":{"ver":true,"crear":true,"editar":true,"eliminar":false},"contactos":{"ver":true,"crear":true,"editar":true,"eliminar":false},"oportunidades":{"ver":true,"crear":true,"editar":true,"eliminar":false},"productos":{"ver":true,"crear":false,"editar":false,"eliminar":false},"agenda":{"ver":true,"crear":true,"editar":true,"eliminar":false}}'::jsonb
  )
  ON CONFLICT (tenant_id, nombre) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_roles_tenant ON public.tenant;
CREATE TRIGGER trg_seed_roles_tenant AFTER INSERT ON public.tenant
  FOR EACH ROW EXECUTE FUNCTION public.seed_roles_tenant();
