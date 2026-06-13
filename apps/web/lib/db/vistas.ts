import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type Visibilidad = "privada" | "publica";

export type Vista = {
  id: string;
  nombre: string;
  query: string;
  columnas: string[] | null;
  aplica_columnas: boolean;
  visibilidad: Visibilidad;
  es_propia: boolean;
};
export type EntidadVista = "oportunidades" | "contactos" | "empresas" | "productos";

// Si la migración 0043 (visibilidad) aún no corrió, hacemos fallback al SELECT
// viejo (sin visibilidad) para no romper.
const isMissingVisibilidad = (msg: string | undefined) =>
  !!msg && /column .*visibilidad.* does not exist/i.test(msg);

/**
 * Vistas guardadas de una entidad visibles para el usuario: las propias (de
 * cualquier visibilidad) + las públicas del tenant. La RLS (mig 0043) lo
 * garantiza; acá marcamos `es_propia` para que la UI sepa cuáles puede borrar.
 */
export async function listVistas(entidad: EntidadVista): Promise<Vista[]> {
  const user = await getSessionUser();
  const supabase = await createServerSupabase();

  const full = await supabase
    .from("vista_guardada")
    .select("id, nombre, query, columnas, aplica_columnas, visibilidad, usuario_id")
    .eq("entidad", entidad)
    .order("creado_en", { ascending: true });

  if (full.error) {
    if (isMissingVisibilidad(full.error.message)) {
      const legacy = await supabase
        .from("vista_guardada")
        .select("id, nombre, query, columnas, aplica_columnas, usuario_id")
        .eq("entidad", entidad)
        .order("creado_en", { ascending: true });
      return ((legacy.data ?? []) as Record<string, unknown>[]).map((v) => ({
        id: v.id as string,
        nombre: v.nombre as string,
        query: v.query as string,
        columnas: Array.isArray(v.columnas) ? (v.columnas as string[]) : null,
        aplica_columnas: !!v.aplica_columnas,
        visibilidad: "privada" as const,
        es_propia: v.usuario_id === user?.id,
      }));
    }
    return [];
  }

  return ((full.data ?? []) as Record<string, unknown>[]).map((v) => ({
    id: v.id as string,
    nombre: v.nombre as string,
    query: v.query as string,
    columnas: Array.isArray(v.columnas) ? (v.columnas as string[]) : null,
    aplica_columnas: !!v.aplica_columnas,
    visibilidad: (v.visibilidad as Visibilidad) ?? "privada",
    es_propia: v.usuario_id === user?.id,
  }));
}

export async function createVista(
  entidad: EntidadVista,
  nombre: string,
  query: string,
  opts: { columnas?: string[] | null; aplica_columnas?: boolean; visibilidad?: Visibilidad } = {},
): Promise<Vista> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    usuario_id: user.id,
    entidad,
    nombre: nombre.trim(),
    query,
    columnas: opts.columnas ?? null,
    aplica_columnas: opts.aplica_columnas ?? false,
    visibilidad: opts.visibilidad ?? "privada",
  };
  let res = await supabase.from("vista_guardada").insert(payload).select("id, nombre, query, columnas, aplica_columnas, visibilidad").single();
  if (res.error && isMissingVisibilidad(res.error.message)) {
    // Fallback sin la columna visibilidad (mig 0043 pendiente).
    const { visibilidad: _v, ...rest } = payload;
    void _v;
    res = await supabase.from("vista_guardada").insert(rest).select("id, nombre, query, columnas, aplica_columnas").single();
  }
  if (res.error) throw new Error(res.error.message);
  const data = res.data as Record<string, unknown>;
  return {
    id: data.id as string,
    nombre: data.nombre as string,
    query: data.query as string,
    columnas: Array.isArray(data.columnas) ? (data.columnas as string[]) : null,
    aplica_columnas: !!data.aplica_columnas,
    visibilidad: (data.visibilidad as Visibilidad) ?? "privada",
    es_propia: true,
  };
}

export async function deleteVista(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  // RLS de escritura solo permite borrar las propias; igual filtramos por tenant.
  const { error } = await supabase
    .from("vista_guardada")
    .delete()
    .eq("id", id)
    .eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}
