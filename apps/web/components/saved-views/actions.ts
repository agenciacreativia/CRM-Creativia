"use server";

import { revalidatePath } from "next/cache";
import { createVista, deleteVista, type Vista, type EntidadVista, type Visibilidad } from "@/lib/db/vistas";

export async function crearVistaAction(
  entidad: EntidadVista,
  nombre: string,
  query: string,
  opts: { columnas?: string[] | null; aplica_columnas?: boolean; visibilidad?: Visibilidad; revalidate?: string } = {},
): Promise<{ ok: boolean; error?: string; vista?: Vista }> {
  try {
    if (!nombre.trim()) return { ok: false, error: "Poné un nombre al filtro." };
    const vista = await createVista(entidad, nombre, query, opts);
    // Revalidar la ruta actual desde el server: actualiza la lista de vistas
    // sin necesidad de router.refresh() en el cliente (que disparaba un Event
    // no manejado en el overlay de dev).
    if (opts.revalidate) revalidatePath(opts.revalidate);
    return { ok: true, vista };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarVistaAction(id: string, revalidate?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteVista(id);
    if (revalidate) revalidatePath(revalidate);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
