"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCatalogoItem, updateCatalogoItem, deleteCatalogoItem } from "@/lib/db/catalogo-mayorista";

type Result = { ok: boolean; error?: string; id?: string };

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(200),
  categoria: z.string().trim().nullable().optional().default(null),
  destino: z.string().trim().nullable().optional().default(null),
  duracion: z.string().trim().nullable().optional().default(null),
  proveedor: z.string().trim().nullable().optional().default(null),
  descripcion: z.string().nullable().optional().default(null),
  incluye: z.string().nullable().optional().default(null),
  no_incluye: z.string().nullable().optional().default(null),
  precio_neto: z.number().nonnegative().nullable().optional().default(null),
  moneda: z.string().trim().max(8).default("USD"),
  cupo: z.number().int().nonnegative().nullable().optional().default(null),
  fecha_salida: z.string().nullable().optional().default(null),
  activo: z.boolean().default(true),
});

export async function guardarCatalogoAction(id: string | null, input: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  const payload = {
    nombre: d.nombre,
    categoria: d.categoria ?? null,
    destino: d.destino ?? null,
    duracion: d.duracion ?? null,
    proveedor: d.proveedor ?? null,
    descripcion: d.descripcion ?? null,
    incluye: d.incluye ?? null,
    no_incluye: d.no_incluye ?? null,
    precio_neto: d.precio_neto ?? null,
    moneda: d.moneda,
    cupo: d.cupo ?? null,
    fecha_salida: d.fecha_salida || null,
    activo: d.activo,
  };
  try {
    const newId = id ? (await updateCatalogoItem(id, payload), id) : await createCatalogoItem(payload);
    revalidatePath("/ajustes/catalogo");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarCatalogoAction(id: string): Promise<Result> {
  try {
    await deleteCatalogoItem(id);
    revalidatePath("/ajustes/catalogo");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
