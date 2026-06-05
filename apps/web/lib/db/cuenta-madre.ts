import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * "Cuenta madre" del CRM: el admin activo más antiguo del tenant.
 * Si no hay admin activo, devuelve null.
 */
const cache = new Map<string, { id: string; at: number }>();
const TTL = 60_000;

export async function cuentaMadre(tenantId: string): Promise<string | null> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL) return hit.id;
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("usuario")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("rol", "admin")
      .eq("activo", true)
      .order("creado_en", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    cache.set(tenantId, { id: data.id as string, at: Date.now() });
    return data.id as string;
  } catch {
    return null;
  }
}

/** Resolver asesor: si viene null, cae en cuenta madre. */
export async function resolverAsesor(tenantId: string, asignadoId: string | null | undefined): Promise<string | null> {
  if (asignadoId) return asignadoId;
  return cuentaMadre(tenantId);
}
