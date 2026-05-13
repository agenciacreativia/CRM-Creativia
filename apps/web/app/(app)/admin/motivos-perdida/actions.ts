"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createMotivoPerdida, updateMotivoPerdida, deleteMotivoPerdida } from "@/lib/db/mutations";

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
});

type Result = { ok: true; id?: string } | { ok: false; error: string };

export async function createMotivoAction(formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const id = await createMotivoPerdida(parsed.data.nombre);
    revalidatePath("/admin/motivos-perdida");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateMotivoAction(id: string, formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await updateMotivoPerdida(id, parsed.data.nombre);
    revalidatePath("/admin/motivos-perdida");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteMotivoAction(id: string): Promise<Result> {
  try {
    await deleteMotivoPerdida(id);
    revalidatePath("/admin/motivos-perdida");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
