"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPlantilla, updatePlantilla, deletePlantilla } from "@/lib/db/mutations";

export type PlantillaResult = { ok: boolean; error?: string };

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  asunto: z.string().trim().max(300).default(""),
  cuerpo_html: z.string().max(50000).default(""),
});

export async function savePlantillaAction(
  id: string | null,
  formData: FormData,
): Promise<PlantillaResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    if (id) await updatePlantilla(id, parsed.data);
    else await createPlantilla(parsed.data);
    revalidatePath("/ajustes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deletePlantillaAction(id: string): Promise<PlantillaResult> {
  try {
    await deletePlantilla(id);
    revalidatePath("/ajustes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
