"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createProducto, updateProducto, deleteProducto } from "@/lib/db/mutations";

export type ProductoResult = { ok: boolean; error?: string; id?: string };

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const numOrNull = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(200),
  categoria: z.preprocess(emptyToNull, z.string().max(60).nullable()),
  destino: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  duracion: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  precio_desde: z.preprocess(numOrNull, z.number().nonnegative().nullable()),
  moneda: z.enum(["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"]).default("USD"),
  descripcion: z.preprocess(emptyToNull, z.string().max(10000).nullable()),
  incluye: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  no_incluye: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  proveedor: z.preprocess(emptyToNull, z.string().max(160).nullable()),
  // Checkbox: marcado = "on"|"true"|true. Si no viene en el FormData (desmarcado),
  // el preprocess recibe undefined y devuelve false. Antes incluía `v === undefined`
  // como truthy, lo que invertía la semántica (desmarcado → activo).
  activo: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
});

export async function saveProductoAction(id: string | null, formData: FormData): Promise<ProductoResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // Mostrar hasta los 3 primeros errores para que el usuario vea todos los campos invalidos
    return { ok: false, error: parsed.error.issues.slice(0, 3).map((i) => i.message).join(", ") };
  }
  try {
    if (id) {
      await updateProducto(id, parsed.data);
      // Revalidar layout completo para invalidar /productos, /productos/[id] y /productos/[id]/editar
      revalidatePath("/productos", "layout");
      return { ok: true, id };
    }
    const newId = await createProducto(parsed.data);
    revalidatePath("/productos", "layout");
    return { ok: true, id: newId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteProductoAction(id: string): Promise<ProductoResult> {
  try {
    await deleteProducto(id);
    revalidatePath("/productos", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
