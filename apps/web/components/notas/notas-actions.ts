"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNota, deleteNota } from "@/lib/db/mutations";

const schema = z.object({
  tipo: z.enum(["empresa", "contacto", "oportunidad"]),
  entity_id: z.string().uuid(),
  contenido: z.string().trim().min(1, "La nota no puede estar vacía").max(5000),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createNotaAction(formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { tipo, entity_id, contenido } = parsed.data;
  try {
    await createNota({
      tipo,
      contenido,
      empresa_id: tipo === "empresa" ? entity_id : null,
      contacto_id: tipo === "contacto" ? entity_id : null,
      oportunidad_id: tipo === "oportunidad" ? entity_id : null,
    });
    revalidatePath(`/${tipo === "empresa" ? "empresas" : tipo === "contacto" ? "contactos" : "oportunidades"}/${entity_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteNotaAction(id: string): Promise<Result> {
  try {
    await deleteNota(id);
    revalidatePath("/empresas");
    revalidatePath("/contactos");
    revalidatePath("/oportunidades");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
