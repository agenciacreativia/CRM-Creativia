"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSede, updateSede, deleteSede } from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const schema = z.object({
  empresa_id: z.string().uuid(),
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  direccion: z.preprocess(emptyToNull, z.string().max(300).nullable()),
  ciudad: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  pais: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  telefono: z.preprocess(emptyToNull, z.string().max(40).nullable()),
  email: z.preprocess(emptyToNull, z.string().email("Email inválido").nullable()),
  es_principal: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createSedeAction(formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await createSede(parsed.data);
    revalidatePath(`/empresas/${parsed.data.empresa_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateSedeAction(id: string, formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const { empresa_id, ...patch } = parsed.data;
    await updateSede(id, patch);
    revalidatePath(`/empresas/${empresa_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteSedeAction(id: string, empresa_id: string): Promise<Result> {
  try {
    await deleteSede(id);
    revalidatePath(`/empresas/${empresa_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
