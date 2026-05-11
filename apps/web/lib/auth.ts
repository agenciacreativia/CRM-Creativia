import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  tenantId: string | null;
  rol: "admin" | "asesor" | null;
  nombre: string;
  idioma: "es" | "en";
};

/**
 * Reads the authenticated user + JWT claims (tenant_id, rol, etc.).
 * Returns null if not signed in or if claims are missing (= broken setup).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Custom claims live in app_metadata via the auth hook
  const claims = user.app_metadata ?? {};
  const tenantId = (claims.tenant_id as string | undefined) ?? null;
  const rol = (claims.rol as "admin" | "asesor" | undefined) ?? null;
  const idioma = (claims.idioma as "es" | "en" | undefined) ?? "es";
  const nombre = (claims.nombre as string | undefined) ?? user.email ?? "";

  return {
    id: user.id,
    email: user.email ?? "",
    tenantId,
    rol,
    idioma,
    nombre,
  };
}
