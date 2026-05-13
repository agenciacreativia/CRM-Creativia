"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActividad, toggleActividad, deleteActividad } from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const schema = z.object({
  oportunidad_id: z.string().uuid(),
  tipo: z.enum(["llamada", "email", "whatsapp", "reunion", "otra"]),
  descripcion: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
  fecha_programada: z.preprocess(emptyToNull, z.string().nullable()),
  completada: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createActividadAction(formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await createActividad(parsed.data);
    revalidatePath(`/oportunidades/${parsed.data.oportunidad_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function toggleActividadAction(id: string, completada: boolean): Promise<Result> {
  try {
    await toggleActividad(id, completada);
    revalidatePath("/oportunidades");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteActividadAction(id: string): Promise<Result> {
  try {
    await deleteActividad(id);
    revalidatePath("/oportunidades");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
