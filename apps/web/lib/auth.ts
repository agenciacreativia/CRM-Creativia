import "server-only";
import { cache } from "react";
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
 * Wrapped in React `cache` so the same request reusing this function in
 * layout + page + nested components only hits Supabase Auth once.
 *
 * Custom claims live in the JWT itself (injected by the auth hook), NOT in
 * `user.app_metadata` (which is sourced from auth.users.raw_app_meta_data).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabase();

  // getUser() validates and refreshes if needed; getSession() reads the
  // (possibly refreshed) access_token from cookies. We need both — but
  // they're synchronous against the cookie store, so doing them in
  // parallel is fine.
  const [{ data: { user } }, { data: { session } }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  if (!user) return null;
  const claims = decodeJwtClaims(session?.access_token);

  return {
    id: user.id,
    email: user.email ?? "",
    tenantId: claims?.tenant_id ?? null,
    rol: claims?.rol ?? null,
    idioma: claims?.idioma ?? "es",
    nombre: claims?.nombre ?? user.email ?? "",
  };
});
