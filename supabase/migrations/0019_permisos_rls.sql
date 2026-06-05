-- ============================================================
-- 0019 — Make RLS permission-aware. A SQL helper reads the
--        signed-in user's role permissions (JSONB) and entity
--        write policies are split per command (insert=crear,
--        update=editar, delete=eliminar). Admins always pass.
--
--  This is what makes custom roles actually enforce CRUD at the
--  database level, not just in the UI.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permiso(modulo TEXT, accion TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.is_admin()
    OR EXISTS (
      SELECT 1
        FROM public.usuario u
        JOIN public.rol r ON r.id = u.rol_id
       WHERE u.id = auth.uid()
         AND (r.es_admin OR (r.permisos -> modulo ->> accion)::boolean IS TRUE)
    ),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_permiso(TEXT, TEXT) TO authenticated;

-- ---------------- empresa ----------------
DROP POLICY IF EXISTS empresa_admin_write ON public.empresa;

CREATE POLICY empresa_insert ON public.empresa
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permiso('empresas', 'crear'));

CREATE POLICY empresa_update ON public.empresa
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permiso('empresas', 'editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permiso('empresas', 'editar'));

CREATE POLICY empresa_delete ON public.empresa
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permiso('empresas', 'eliminar'));

-- ---------------- contacto ----------------
DROP POLICY IF EXISTS contacto_admin_write ON public.contacto;

CREATE POLICY contacto_insert ON public.contacto
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permiso('contactos', 'crear'));

CREATE POLICY contacto_update ON public.contacto
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permiso('contactos', 'editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permiso('contactos', 'editar'));

CREATE POLICY contacto_delete ON public.contacto
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permiso('contactos', 'eliminar'));

-- ---------------- producto ----------------
DROP POLICY IF EXISTS producto_write ON public.producto;

CREATE POLICY producto_insert ON public.producto
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permiso('productos', 'crear'));

CREATE POLICY producto_update ON public.producto
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permiso('productos', 'editar'))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_permiso('productos', 'editar'));

CREATE POLICY producto_delete ON public.producto
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_permiso('productos', 'eliminar'));

-- ---------------- oportunidad (permission + ownership) ----------------
DROP POLICY IF EXISTS oportunidad_insert ON public.oportunidad;
DROP POLICY IF EXISTS oportunidad_update ON public.oportunidad;
DROP POLICY IF EXISTS oportunidad_admin_delete ON public.oportunidad;

CREATE POLICY oportunidad_insert ON public.oportunidad
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permiso('oportunidades', 'crear')
    AND (public.is_admin() OR asignado_id = auth.uid())
  );

CREATE POLICY oportunidad_update ON public.oportunidad
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_permiso('oportunidades', 'editar')
    AND (public.is_admin() OR asignado_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_permiso('oportunidades', 'editar')
    AND (public.is_admin() OR asignado_id = auth.uid())
  );

CREATE POLICY oportunidad_delete ON public.oportunidad
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_permiso('oportunidades', 'eliminar')
    AND (public.is_admin() OR asignado_id = auth.uid())
  );
