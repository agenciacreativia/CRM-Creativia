import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Read-only client for the EXTERNAL Supabase project (the website's
 * cupos/planes inventory). Returns null if not configured, so callers can
 * fall back gracefully. Never exposed to the browser.
 */
export function createCuposSupabase(): SupabaseClient | null {
  const url = serverEnv.CUPOS_SUPABASE_URL;
  const key = serverEnv.CUPOS_SUPABASE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function cuposConfigurado(): boolean {
  return !!serverEnv.CUPOS_SUPABASE_URL && !!serverEnv.CUPOS_SUPABASE_KEY;
}
