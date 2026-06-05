"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setEtiquetasDe, createEtiqueta, deleteEtiqueta } from "@/lib/db/etiquetas";
import type { Etiqueta } from "@/lib/db/etiquetas";

const entidadSchema = z.enum(["oportunidad", "contacto", "empresa"]);

export async function setEtiquetasAction(
  entidad: "oportunidad" | "contacto" | "empresa",
  entityId: string,
  etiquetaIds: string[],
  revalidate?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    entidadSchema.parse(entidad);
    await setEtiquetasDe(entidad, entityId, etiquetaIds.filter(Boolean));
    if (revalidate) revalidatePath(revalidate);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function crearEtiquetaAction(
  nombre: string,
  color: string,
): Promise<{ ok: boolean; error?: string; etiqueta?: Etiqueta }> {
  try {
    if (!nombre.trim()) return { ok: false, error: "Nombre requerido" };
    const etiqueta = await createEtiqueta(nombre, color);
    return { ok: true, etiqueta };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarEtiquetaAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteEtiqueta(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
