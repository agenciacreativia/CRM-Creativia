-- ============================================================
-- 0003_rls_policies.sql
-- Row Level Security: ALL tenant-scoped tables filter by JWT.tenant_id.
-- Asesores see only their own opportunities (and related activities).
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions: read claims from the auth JWT
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_rol()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'rol', '');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT public.current_rol() = 'admin';
$$;

-- ------------------------------------------------------------
-- usuario
-- ------------------------------------------------------------
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_tenant_isolation ON public.usuario
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY usuario_self_update ON public.usuario
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = public.current_tenant_id());

CREATE POLICY usuario_admin_all ON public.usuario
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- empresa
-- ------------------------------------------------------------
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY empresa_select ON public.empresa
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY empresa_admin_write ON public.empresa
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- contacto
-- ------------------------------------------------------------
ALTER TABLE public.contacto ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacto_select ON public.contacto
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY contacto_admin_write ON public.contacto
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- pipeline + etapa_pipeline
-- ------------------------------------------------------------
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_select ON public.pipeline
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY pipeline_admin_write ON public.pipeline
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

ALTER TABLE public.etapa_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY etapa_select ON public.etapa_pipeline
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY etapa_admin_write ON public.etapa_pipeline
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- motivo_perdida
-- ------------------------------------------------------------
ALTER TABLE public.motivo_perdida ENABLE ROW LEVEL SECURITY;

CREATE POLICY motivo_select ON public.motivo_perdida
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY motivo_admin_write ON public.motivo_perdida
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- oportunidad — asesor sees only own
-- ------------------------------------------------------------
ALTER TABLE public.oportunidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY oportunidad_select ON public.oportunidad
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_admin() OR asignado_id = auth.uid())
  );

CREATE POLICY oportunidad_insert ON public.oportunidad
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.is_admin() OR asignado_id = auth.uid())
  );

CREATE POLICY oportunidad_update ON public.oportunidad
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_admin() OR asignado_id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.is_admin() OR asignado_id = auth.uid())
  );

CREATE POLICY oportunidad_admin_delete ON public.oportunidad
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- historial_etapa (read-only for asesores on their own opps)
-- ------------------------------------------------------------
ALTER TABLE public.historial_etapa ENABLE ROW LEVEL SECURITY;

CREATE POLICY historial_select ON public.historial_etapa
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.oportunidad o
        WHERE o.id = historial_etapa.oportunidad_id AND o.asignado_id = auth.uid()
      )
    )
  );

CREATE POLICY historial_insert ON public.historial_etapa
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ------------------------------------------------------------
-- actividad (same scope as opportunity)
-- ------------------------------------------------------------
ALTER TABLE public.actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY actividad_select ON public.actividad
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.oportunidad o
        WHERE o.id = actividad.oportunidad_id AND o.asignado_id = auth.uid()
      )
    )
  );

CREATE POLICY actividad_write ON public.actividad
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.oportunidad o
        WHERE o.id = actividad.oportunidad_id AND o.asignado_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.oportunidad o
        WHERE o.id = actividad.oportunidad_id AND o.asignado_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- nota
-- ------------------------------------------------------------
ALTER TABLE public.nota ENABLE ROW LEVEL SECURITY;

CREATE POLICY nota_select ON public.nota
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY nota_write ON public.nota
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND creado_por = auth.uid());

CREATE POLICY nota_owner_update ON public.nota
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (creado_por = auth.uid() OR public.is_admin()));

CREATE POLICY nota_owner_delete ON public.nota
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (creado_por = auth.uid() OR public.is_admin()));

-- ------------------------------------------------------------
-- campo_personalizado (admin-only)
-- ------------------------------------------------------------
ALTER TABLE public.campo_personalizado ENABLE ROW LEVEL SECURITY;

CREATE POLICY campo_select ON public.campo_personalizado
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY campo_admin_write ON public.campo_personalizado
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());

-- ------------------------------------------------------------
-- backup_log (admin-only)
-- ------------------------------------------------------------
ALTER TABLE public.backup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY backup_admin_read ON public.backup_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_admin());

CREATE POLICY backup_admin_write ON public.backup_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin());
