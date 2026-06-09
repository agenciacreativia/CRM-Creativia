"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteEmpresaConCascada, logCambio } from "@/lib/db/mutations";
import { createServerSupabase } from "@/lib/supabase/server";

/** Devuelve el impacto del borrado para el modal de confirmación. */
export async function getDeleteEmpresaContext(id: string): Promise<{
  empresa_nombre: string;
  contactos: number;
  oportunidades_activas: { id: string; nombre: string }[];
  oportunidades_cerradas: number;
}> {
  const supabase = await createServerSupabase();
  const [{ data: empresa }, { count: contactos }, { data: activas }, { count: cerradas }] = await Promise.all([
    supabase.from("empresa").select("nombre").eq("id", id).single(),
    supabase.from("contacto").select("id", { count: "exact", head: true }).eq("empresa_id", id),
    supabase.from("oportunidad").select("id, nombre").eq("empresa_id", id).eq("estado", "activo").limit(10),
    supabase.from("oportunidad").select("id", { count: "exact", head: true }).eq("empresa_id", id).neq("estado", "activo"),
  ]);

  return {
    empresa_nombre: empresa?.nombre ?? "—",
    contactos: contactos ?? 0,
    oportunidades_activas: (activas ?? []) as { id: string; nombre: string }[],
    oportunidades_cerradas: cerradas ?? 0,
  };
}

export type DeleteEmpresaState = { ok: boolean; error?: string };

export async function deleteEmpresaAction(id: string): Promise<DeleteEmpresaState> {
  try {
    const res = await deleteEmpresaConCascada(id);
    await logCambio(
      "empresa",
      id,
      `Empresa borrada con cascada (${res.contactos} contactos, ${res.oportunidades_cerradas} oportunidades cerradas)`,
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath("/empresas");
  redirect("/empresas");
}
