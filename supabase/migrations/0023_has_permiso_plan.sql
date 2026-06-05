-- ============================================================
-- 0023 — Harden permission checks with the plan ceiling at RLS.
--
--  has_permiso(modulo, accion) now returns ROLE ∩ PLAN:
--    · ROLE side  — admin or the user's role grants the action.
--    · PLAN side  — the tenant's plan includes the action
--                   (platform tenant or no plan = no ceiling).
--
--  This mirrors the app-layer getMyPermisos() so a direct API call
--  can't bypass the plan. Used by the empresa / contacto /
--  oportunidad / producto write policies (migration 0019).
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permiso(modulo TEXT, accion TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT u.rol_id, t.es_plataforma, t.plan_id
      FROM public.usuario u
      JOIN public.tenant t ON t.id = u.tenant_id
     WHERE u.id = auth.uid()
  )
  SELECT COALESCE(
    -- ROLE side: admin, or the user's role grants the action.
    (
      COALESCE(public.is_admin(), FALSE)
      OR EXISTS (
        SELECT 1
          FROM public.rol r
          JOIN ctx ON r.id = ctx.rol_id
         WHERE r.es_admin OR (r.permisos -> modulo ->> accion)::boolean IS TRUE
      )
    )
    AND
    -- PLAN side: no ceiling (platform / no plan) or the plan includes it.
    (
      (SELECT es_plataforma FROM ctx) IS TRUE
      OR (SELECT plan_id FROM ctx) IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.plan p
          JOIN ctx ON p.id = ctx.plan_id
         WHERE (p.modulos -> modulo ->> accion)::boolean IS TRUE
      )
    ),
    FALSE
  );
$$;
