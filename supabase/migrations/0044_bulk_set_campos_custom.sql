-- 0044 — RPC para actualización masiva de campos personalizados (campos_custom).
-- El cliente JS de Supabase no puede expresar `jsonb || patch` en .update(), así
-- que mergeamos en una sola query SQL. Whitelist de tablas para evitar inyección
-- de nombre de tabla. Tenant-scoped: solo afecta filas del tenant indicado.

CREATE OR REPLACE FUNCTION public.bulk_set_campos_custom(
  p_tabla  text,
  p_ids    uuid[],
  p_tenant uuid,
  p_patch  jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF p_tabla NOT IN ('empresa', 'contacto', 'oportunidad') THEN
    RAISE EXCEPTION 'tabla no permitida: %', p_tabla;
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'patch inválido';
  END IF;

  EXECUTE format(
    'UPDATE public.%I
        SET campos_custom = COALESCE(campos_custom, ''{}''::jsonb) || $1
      WHERE id = ANY($2) AND tenant_id = $3',
    p_tabla
  ) USING p_patch, p_ids, p_tenant;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bulk_set_campos_custom FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_set_campos_custom TO service_role;

COMMENT ON FUNCTION public.bulk_set_campos_custom IS
  'Merge masivo de un patch jsonb en campos_custom para empresa/contacto/oportunidad, acotado por tenant. Usado por bulkActualizarAction.';
