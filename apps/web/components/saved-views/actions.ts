"use server";

import { createVista, deleteVista, type Vista, type EntidadVista } from "@/lib/db/vistas";

export async function crearVistaAction(
  entidad: EntidadVista,
  nombre: string,
  query: string,
): Promise<{ ok: boolean; error?: string; vista?: Vista }> {
  try {
    const vista = await createVista(entidad, nombre, query);
    return { ok: true, vista };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarVistaAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteVista(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
