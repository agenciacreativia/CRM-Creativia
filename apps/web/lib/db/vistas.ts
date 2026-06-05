import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type Vista = { id: string; nombre: string; query: string };
export type EntidadVista = "oportunidades" | "contactos" | "empresas";

/** Saved views for the current user + entity. Defensive: [] pre-0024. */
export async function listVistas(entidad: EntidadVista): Promise<Vista[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("vista_guardada")
    .select("id, nombre, query")
    .eq("entidad", entidad)
    .order("creado_en", { ascending: true });
  if (error) return [];
  return (data ?? []) as Vista[];
}

export async function createVista(entidad: EntidadVista, nombre: string, query: string): Promise<Vista> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("vista_guardada")
    .insert({ tenant_id: user.tenantId, usuario_id: user.id, entidad, nombre: nombre.trim(), query })
    .select("id, nombre, query")
    .single();
  if (error) throw new Error(error.message);
  return data as Vista;
}

export async function deleteVista(id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("vista_guardada").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
