/**
 * Diagnostic: check Auth Hook configuration in Supabase.
 * Run: npx tsx scripts/diagnose-hook.ts
 */
import postgres from "postgres";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

async function main() {
  console.log("\n=== 1. Does the function exist? ===");
  const fn = await sql`
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args,
           pg_catalog.pg_get_userbyid(p.proowner) AS owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'custom_access_token_hook'
  `;
  console.log(fn);

  console.log("\n=== 2. Grants on the function ===");
  const grants = await sql`
    SELECT grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_name = 'custom_access_token_hook'
      AND routine_schema = 'public'
  `;
  console.log(grants);

  console.log("\n=== 3. Can supabase_auth_admin SELECT from usuario? ===");
  const usrGrant = await sql`
    SELECT grantee, privilege_type
    FROM information_schema.table_privileges
    WHERE table_name = 'usuario' AND table_schema = 'public'
      AND grantee = 'supabase_auth_admin'
  `;
  console.log(usrGrant);

  console.log("\n=== 4. Test the function manually with a real user ===");
  const testUser = await sql`SELECT id FROM public.usuario WHERE email = 'admin@acme.test' LIMIT 1`;
  if (testUser.length === 0) {
    console.log("No usuario row for admin@acme.test — that's the problem!");
  } else {
    const userId = testUser[0].id;
    console.log(`Testing hook with user_id=${userId}`);
    const result = await sql`
      SELECT public.custom_access_token_hook(
        jsonb_build_object(
          'user_id', ${userId}::text,
          'claims', '{"sub":"","email":""}'::jsonb
        )
      ) AS result
    `;
    console.log("Hook output:", JSON.stringify(result[0]?.result, null, 2));
  }

  console.log("\n=== 5. Auth hook config in auth.config (if accessible) ===");
  try {
    const cfg = await sql`
      SELECT key, value
      FROM auth.config
      WHERE key LIKE '%hook%'
    `;
    console.log(cfg);
  } catch (e) {
    console.log("Cannot read auth.config (expected — restricted)");
  }

  console.log("\n=== 6. List rows in public.usuario ===");
  const users = await sql`SELECT id, email, tenant_id, rol, activo FROM public.usuario`;
  console.log(users);

  await sql.end();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
