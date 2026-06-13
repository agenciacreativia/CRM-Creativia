"use server";

import { revalidatePath } from "next/cache";
import { createListaEnvio } from "@/lib/db/listas-envio";
import { listContactos } from "@/lib/db/contactos";
import { getFilterFields } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";

export async function crearListaAction({
  nombre,
  descripcion,
  filtrosEncoded,
}: {
  nombre: string;
  descripcion: string;
  filtrosEncoded: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    if (!nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
    const spec = decodeFilterSpec(filtrosEncoded || undefined);
    const fields = await getFilterFields("contacto");
    const fbm = { contacto: fields };
    // Tope alto para no quemar RAM cuando hay 50k+ contactos. Si superamos el
    // tope reportamos al usuario que la lista podría no estar completa.
    const LIMIT = 10_000;
    const rows = await listContactos({ limit: LIMIT });
    const matches = spec && specHasConditions(spec)
      ? rows.filter((r) => rowMatches(r as unknown as Record<string, unknown>, spec, fbm, "contacto"))
      : rows;
    if (rows.length === LIMIT) {
      console.warn(`[campanias/listas/nueva] truncado en ${LIMIT} contactos — implementar conteo server-side`);
    }
    const id = await createListaEnvio({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      filtros: { encoded: filtrosEncoded, modulo: "contacto" },
      contactos: matches.length,
    });
    revalidatePath("/campanias");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
