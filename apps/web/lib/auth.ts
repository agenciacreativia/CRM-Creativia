import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { decodeJwtClaims } from "@/lib/jwt";

export type SessionUser = {
  id: string;
  email: string;
  tenantId: string | null;
  rol: "admin" | "asesor" | null;
  nombre: string;
  idioma: "es" | "en";
};

/**
 * Reads the authenticated user + JWT custom claims (tenant_id, rol, etc.).
 * Returns null if not signed in or if claims are missing (= broken setup).
 *
 * Custom claims live in the JWT itself (injected by the auth hook), NOT in
 * `user.app_metadata` (which is sourced from auth.users.raw_app_meta_data).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();

  // Validate the session (refreshes if needed)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Read the access_token to decode its claims
  const { data: { session } } = await supabase.auth.getSession();
  const claims = decodeJwtClaims(session?.access_token);

  return {
    id: user.id,
    email: user.email ?? "",
    tenantId: claims?.tenant_id ?? null,
    rol: claims?.rol ?? null,
    idioma: claims?.idioma ?? "es",
    nombre: claims?.nombre ?? user.email ?? "",
  };
}
