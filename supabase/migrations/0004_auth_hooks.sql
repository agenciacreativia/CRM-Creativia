-- ============================================================
-- 0004_auth_hooks.sql
-- Custom Access Token Hook — injects tenant_id, rol, idioma into JWT.
-- Required: enable this hook in Supabase Dashboard → Auth → Hooks.
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_row    record;
  claims      jsonb;
BEGIN
  -- Look up the user's tenant + rol + locale from `usuario`
  SELECT tenant_id, rol, activo, idioma_preferido, nombre
    INTO user_row
    FROM public.usuario
   WHERE id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF user_row IS NULL THEN
    -- Authenticated user without a usuario row → block access by leaving claims clean
    -- (no tenant_id means RLS policies fail closed)
    RETURN event;
  END IF;

  IF NOT user_row.activo THEN
    -- Soft-deleted users can't get a tenant scope either
    RETURN event;
  END IF;

  claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_row.tenant_id::text));
  claims := jsonb_set(claims, '{rol}',       to_jsonb(user_row.rol));
  claims := jsonb_set(claims, '{idioma}',    to_jsonb(user_row.idioma_preferido));
  claims := jsonb_set(claims, '{nombre}',    to_jsonb(user_row.nombre));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grants required by Supabase Auth hooks
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.usuario TO supabase_auth_admin;

-- Lock down: nobody else should call this function
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

COMMENT ON FUNCTION public.custom_access_token_hook IS
  'Supabase Auth: inject tenant_id, rol, idioma into JWT claims. Enable in Auth → Hooks → Custom Access Token Hook.';

-- ============================================================
-- Trigger: when a new auth user is created, ensure a usuario row exists.
-- (Usually populated by provisioning flow; this is a safety net.)
-- ============================================================
-- Disabled by default. Uncomment when admin user provisioning flow is built.
--
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   -- requires raw_user_meta_data to include tenant_id and rol
--   INSERT INTO public.usuario (id, tenant_id, nombre, email, rol)
--   SELECT NEW.id,
--          (NEW.raw_user_meta_data ->> 'tenant_id')::uuid,
--          COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email),
--          NEW.email,
--          COALESCE(NEW.raw_user_meta_data ->> 'rol', 'asesor')
--   WHERE NEW.raw_user_meta_data ->> 'tenant_id' IS NOT NULL;
--   RETURN NEW;
-- END;
-- $$;
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
