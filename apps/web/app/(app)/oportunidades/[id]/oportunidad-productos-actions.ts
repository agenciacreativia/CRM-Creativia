"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addOportunidadProducto,
  updateOportunidadProducto,
  removeOportunidadProducto,
  patchOportunidad,
  logCambio,
} from "@/lib/db/mutations";

export type ProductoResult = { ok: boolean; error?: string; id?: string };

const addSchema = z.object({
  oportunidad_id: z.string().uuid(),
  producto_id: z.string().uuid().nullable().optional().default(null),
  nombre: z.string().trim().min(1, "Nombre requerido").max(300),
  cantidad: z.number().nonnegative().default(1),
  precio_unitario: z.number().nonnegative().default(0),
  moneda: z.enum(["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"]).default("USD"),
});

export type AddProductoPayload = z.input<typeof addSchema>;

export async function addOportunidadProductoAction(payload: AddProductoPayload): Promise<ProductoResult> {
  const parsed = addSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    const id = await addOportunidadProducto({
      oportunidad_id: d.oportunidad_id,
      producto_id: d.producto_id ?? null,
      nombre: d.nombre,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      moneda: d.moneda,
    });
    await logCambio("oportunidad", d.oportunidad_id, `Agregó el producto "${d.nombre}"`);
    revalidatePath(`/oportunidades/${d.oportunidad_id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

const updateSchema = z.object({
  nombre: z.string().trim().min(1).max(300).optional(),
  cantidad: z.number().nonnegative().optional(),
  precio_unitario: z.number().nonnegative().optional(),
});

export async function updateOportunidadProductoAction(
  id: string,
  oportunidadId: string,
  patch: z.input<typeof updateSchema>,
): Promise<ProductoResult> {
  const parsed = updateSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await updateOportunidadProducto(id, parsed.data);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function removeOportunidadProductoAction(id: string, oportunidadId: string): Promise<ProductoResult> {
  try {
    await removeOportunidadProducto(id);
    await logCambio("oportunidad", oportunidadId, "Quitó un producto de la oportunidad");
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/** Set the opportunity's value (valor) from the products total. */
export async function setOportunidadValorAction(oportunidadId: string, valor: number): Promise<ProductoResult> {
  try {
    await patchOportunidad(oportunidadId, { valor });
    await logCambio("oportunidad", oportunidadId, `Actualizó el valor a ${valor} desde los productos`);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
