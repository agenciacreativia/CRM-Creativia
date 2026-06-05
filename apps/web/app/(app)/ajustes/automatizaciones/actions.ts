"use server";

import { revalidatePath } from "next/cache";
import { createRegla, updateRegla, deleteRegla, type ReglaInput } from "@/lib/db/automatizaciones";

type Result = { ok: boolean; error?: string; id?: string };

export async function guardarReglaAction(id: string | null, input: ReglaInput): Promise<Result> {
  try {
    if (!input.nombre.trim()) return { ok: false, error: "Nombre requerido" };
    if (id) {
      await updateRegla(id, input);
      revalidatePath("/ajustes/automatizaciones");
      return { ok: true, id };
    }
    const newId = await createRegla(input);
    revalidatePath("/ajustes/automatizaciones");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarReglaAction(id: string): Promise<Result> {
  try {
    await deleteRegla(id);
    revalidatePath("/ajustes/automatizaciones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
