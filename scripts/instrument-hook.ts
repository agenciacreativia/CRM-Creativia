/**
 * Add a logging table + instrument the hook so we can see if Supabase Auth
 * is actually invoking it. After running, do a login and re-check the log table.
 */
import postgres from "postgres";

const url = process.env.SUPABASE_DB_URL!;
const sql = postgres(url, { prepare: false });

async function main() {
  console.log("Creating hook_log table + instrumenting function...");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.hook_log (
      id BIGSERIAL PRIMARY KEY,
      called_at TIMESTAMPTZ DEFAULT NOW(),
      event JSONB,
      result JSONB
    );
    GRANT INSERT ON public.hook_log TO supabase_auth_admin;
    GRANT USAGE, SELECT ON SEQUENCE public.hook_log_id_seq TO supabase_auth_admin;
    ALTER TABLE public.hook_log DISABLE ROW LEVEL SECURITY;
  `);

  await sql.unsafe(`
    CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    VOLATILE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      user_row record;
      claims  jsonb;
      result  jsonb;
    BEGIN
      claims := event -> 'claims';

      SELECT tenant_id, rol, activo, idioma_preferido, nombre
        INTO user_row
        FROM public.usuario
       WHERE id = (event ->> 'user_id')::uuid;

      IF user_row IS NOT NULL AND user_row.activo THEN
        claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_row.tenant_id::text));
        claims := jsonb_set(claims, '{rol}',       to_jsonb(user_row.rol));
        claims := jsonb_set(claims, '{idioma}',    to_jsonb(user_row.idioma_preferido));
        claims := jsonb_set(claims, '{nombre}',    to_jsonb(user_row.nombre));
      END IF;

      result := jsonb_set(event, '{claims}', claims);

      -- Audit trail (safe: only writes when hook is actually invoked)
      INSERT INTO public.hook_log (event, result) VALUES (event, result);

      RETURN result;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
    REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
  `);

  console.log("✓ Hook re-installed with VOLATILE + SECURITY DEFINER + logging.");
  console.log("\nNow trying a login to trigger the hook...");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
