"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTerritorio, updateTerritorio, deleteTerritorio, setUsuarioTerritorio, type TerritorioInput } from "@/lib/db/territorios";

type Result = { ok: boolean; error?: string; id?: string };

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(80),
  descripcion: z.string().nullable().optional().default(null),
  meta: z.number().nonnegative().default(0),
  moneda: z.string().max(8).default("USD"),
  activo: z.boolean().default(true),
});

export async function guardarTerritorioAction(id: string | null, input: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d: TerritorioInput = {
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion ?? null,
    meta: parsed.data.meta,
    moneda: parsed.data.moneda,
    activo: parsed.data.activo,
  };
  try {
    const newId = id ? (await updateTerritorio(id, d), id) : await createTerritorio(d);
    revalidatePath("/ajustes/territorios");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarTerritorioAction(id: string): Promise<Result> {
  try {
    await deleteTerritorio(id);
    revalidatePath("/ajustes/territorios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function asignarTerritorioAction(usuarioId: string, territorioId: string | null): Promise<Result> {
  try {
    await setUsuarioTerritorio(usuarioId, territorioId);
    revalidatePath("/ajustes/territorios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
