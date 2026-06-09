"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteContactoConReasignacion, logCambio } from "@/lib/db/mutations";
import { listOportunidadesDeContacto } from "@/lib/db/relaciones";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Devuelve la info que necesita el modal de confirmación:
 * - oportunidades vinculadas al contacto
 * - contactos disponibles para reasignar (priorizamos los de la misma empresa)
 */
export async function getDeleteContactoContext(id: string): Promise<{
  oportunidades: { id: string; nombre: string; estado: string }[];
  candidatos: { id: string; nombre: string; empresa_nombre: string; misma_empresa: boolean }[];
}> {
  const supabase = await createServerSupabase();
  const { data: contacto } = await supabase
    .from("contacto")
    .select("empresa_id")
    .eq("id", id)
    .single();

  const oportunidades = (await listOportunidadesDeContacto(id)).map((o) => ({
    id: o.id,
    nombre: o.nombre,
    estado: o.estado,
  }));

  // Candidatos: cualquier otro contacto del tenant, excluido el actual.
  // Marcamos los que comparten empresa para que el UI los muestre primero.
  const { data: others } = await supabase
    .from("contacto")
    // Embed explícito (mig 0042 introdujo ambigüedad con la M-N).
    .select("id, nombre, empresa_id, empresa:empresa!contacto_empresa_id_fkey(nombre)")
    .neq("id", id)
    .limit(500);
  type EmpresaRel = { nombre: string | null } | { nombre: string | null }[] | null;
  type Row = { id: string; nombre: string; empresa_id: string; empresa: EmpresaRel };
  const candidatos = ((others ?? []) as Row[]).map((r) => {
    const emp = Array.isArray(r.empresa) ? r.empresa[0] : r.empresa;
    return {
      id: r.id,
      nombre: r.nombre,
      empresa_nombre: emp?.nombre ?? "—",
      misma_empresa: contacto?.empresa_id === r.empresa_id,
    };
  });
  candidatos.sort((a, b) => Number(b.misma_empresa) - Number(a.misma_empresa) || a.nombre.localeCompare(b.nombre));

  return { oportunidades, candidatos };
}

export type DeleteContactoState = { ok: boolean; error?: string; reasignadas?: number };

export async function deleteContactoAction(
  id: string,
  reasignarA: string | null,
): Promise<DeleteContactoState> {
  try {
    const { reasignadas } = await deleteContactoConReasignacion(id, reasignarA);
    if (reasignadas > 0 && reasignarA) {
      await logCambio(
        "contacto",
        reasignarA,
        `Heredó ${reasignadas} oportunidad(es) por borrado del contacto ${id}`,
      );
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath("/contactos");
  if (reasignarA) revalidatePath(`/contactos/${reasignarA}`);
  // El detalle del contacto borrado ya no existe; redirigimos al list.
  redirect("/contactos");
}
