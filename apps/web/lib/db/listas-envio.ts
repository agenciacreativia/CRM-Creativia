import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type ListaEnvio = {
  id: string; nombre: string; descripcion: string | null;
  filtros: Record<string, unknown>; contactos: number; creado_en: string;
};

// Paginación: limit por defecto acotado para evitar descargar miles de filas.
export async function listListasEnvio(opts?: { limit?: number; offset?: number }): Promise<ListaEnvio[]> {
  try {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const offset = Math.max(opts?.offset ?? 0, 0);
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("lista_envio")
      .select("id, nombre, descripcion, filtros, contactos, creado_en")
      .order("creado_en", { ascending: false })
      .range(offset, offset + limit - 1);
    return (data ?? []) as ListaEnvio[];
  } catch { return []; }
}

export async function getListaEnvio(id: string): Promise<ListaEnvio | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("lista_envio").select("id, nombre, descripcion, filtros, contactos, creado_en").eq("id", id).maybeSingle();
    return (data as ListaEnvio) ?? null;
  } catch { return null; }
}

export async function createListaEnvio(input: { nombre: string; descripcion: string | null; filtros: Record<string, unknown>; contactos: number }): Promise<string> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("lista_envio")
    .insert({ ...input, tenant_id: user.tenantId, creado_por: user.id })
    .select("id").single();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("No se pudo crear la lista de envío");
  return data.id as string;
}

export async function deleteListaEnvio(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  if (user.rol !== "admin") throw new Error("Solo administradores pueden eliminar listas de envío");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("lista_envio").delete().eq("id", id).eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}
