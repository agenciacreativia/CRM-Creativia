"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getMyPermisos } from "@/lib/db/roles";
import { can } from "@/lib/permissions";
import { addEtiquetaABulk } from "@/lib/db/etiquetas";

type Result = { ok: boolean; error?: string };

// Límite máximo de IDs por operación bulk para evitar queries gigantes
const MAX_BULK_IDS = 500;

async function ensure(action: "editar" | "eliminar") {
  const { permisos, es_admin } = await getMyPermisos();
  if (!can(permisos, "oportunidades", action, es_admin)) throw new Error("No tenés permiso para esta acción");
}

export async function bulkReasignarAction(ids: string[], asignadoId: string | null): Promise<Result> {
  try {
    if (ids.length === 0) return { ok: true };
    await ensure("editar");
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("oportunidad").update({ asignado_id: asignadoId || null }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/oportunidades/tabla");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function bulkEstadoAction(ids: string[], estado: "activo" | "ganado" | "perdido"): Promise<Result> {
  try {
    if (ids.length === 0) return { ok: true };
    await ensure("editar");
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("oportunidad").update({ estado }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/oportunidades/tabla");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function bulkEtiquetaAction(ids: string[], etiquetaId: string): Promise<Result> {
  try {
    if (ids.length === 0 || !etiquetaId) return { ok: true };
    await ensure("editar");
    await addEtiquetaABulk("oportunidad", ids, etiquetaId);
    revalidatePath("/oportunidades/tabla");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function bulkEliminarAction(ids: string[]): Promise<Result> {
  try {
    if (ids.length === 0) return { ok: true };
    if (ids.length > MAX_BULK_IDS) {
      return { ok: false, error: `Demasiados elementos seleccionados (máximo ${MAX_BULK_IDS})` };
    }
    await ensure("eliminar");
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("oportunidad").update({ estado: "eliminado" }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/oportunidades/tabla");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
