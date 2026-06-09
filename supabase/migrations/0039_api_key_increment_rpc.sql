-- 0039 — Atomic increment RPC for api_key.usados_mes (evita race condition al
-- contar usos del API concurrentes desde varios POST /api/v1/* simultáneos).

CREATE OR REPLACE FUNCTION public.incrementar_uso_api_key(p_key_id UUID)
RETURNS TABLE(usados_mes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.api_key
     SET usados_mes = COALESCE(api_key.usados_mes, 0) + 1,
         ultimo_uso = NOW()
   WHERE id = p_key_id
   RETURNING api_key.usados_mes;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.incrementar_uso_api_key FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.incrementar_uso_api_key TO service_role;

COMMENT ON FUNCTION public.incrementar_uso_api_key IS
  'Increment atómico de usados_mes en api_key. Usado por authenticateApiKey() para evitar race conditions en el contador de uso mensual.';
