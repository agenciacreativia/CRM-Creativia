import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";

/**
 * Admin client using the service_role key. BYPASSES RLS.
 * NEVER expose to the browser. Only use for:
 *   - Provisioning new tenants
 *   - Subdomain → tenant lookup before auth
 *   - Backup/restore operations
 *   - Admin user management
 */
export function createAdminSupabase() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }
  return createClient(env.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
