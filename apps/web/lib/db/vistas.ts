import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type Vista = {
  id: string;
  nombre: string;
  query: string;
  columnas: string[] | null;
  aplica_columnas: boolean;
};
export type EntidadVista = "oportunidades" | "contactos" | "empresas";

/** Saved views for the current user + entity. Defensive: [] pre-0024. */
export async function listVistas(entidad: EntidadVista): Promise<Vista[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("vista_guardada")
    .select("id, nombre, query, columnas, aplica_columnas")
    .eq("entidad", entidad)
    .order("creado_en", { ascending: true });
  if (error) return [];
  return ((data ?? []) as { id: string; nombre: string; query: string; columnas: string[] | null; aplica_columnas: boolean | null }[]).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    query: v.query,
    columnas: Array.isArray(v.columnas) ? v.columnas : null,
    aplica_columnas: !!v.aplica_columnas,
  }));
}

export async function createVista(
  entidad: EntidadVista,
  nombre: string,
  query: string,
  opts: { columnas?: string[] | null; aplica_columnas?: boolean } = {},
): Promise<Vista> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("vista_guardada")
    .insert({
      tenant_id: user.tenantId,
      usuario_id: user.id,
      entidad,
      nombre: nombre.trim(),
      query,
      columnas: opts.columnas ?? null,
      aplica_columnas: opts.aplica_columnas ?? false,
    })
    .select("id, nombre, query, columnas, aplica_columnas")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id as string,
    nombre: data.nombre as string,
    query: data.query as string,
    columnas: Array.isArray(data.columnas) ? (data.columnas as string[]) : null,
    aplica_columnas: !!data.aplica_columnas,
  };
}

export async function deleteVista(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("vista_guardada")
    .delete()
    .eq("id", id)
    .eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}
