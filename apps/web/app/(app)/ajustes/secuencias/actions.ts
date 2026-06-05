"use server";

import { revalidatePath } from "next/cache";
import { createSecuencia, updateSecuencia, deleteSecuencia, type SecuenciaInput } from "@/lib/db/secuencias";

type Result = { ok: boolean; error?: string; id?: string };

export async function guardarSecuenciaAction(id: string | null, input: SecuenciaInput): Promise<Result> {
  try {
    if (!input.nombre.trim()) return { ok: false, error: "Nombre requerido" };
    if (input.pasos.length === 0) return { ok: false, error: "Agregá al menos un paso" };
    const newId = id ? (await updateSecuencia(id, input), id) : await createSecuencia(input);
    revalidatePath("/ajustes/secuencias");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarSecuenciaAction(id: string): Promise<Result> {
  try {
    await deleteSecuencia(id);
    revalidatePath("/ajustes/secuencias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
