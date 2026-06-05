"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCampania, deleteCampania, enviarCampania } from "@/lib/db/campanias";

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  asunto: z.string().trim().min(1, "Asunto requerido").max(200),
  cuerpo_html: z.string().min(1, "Cuerpo requerido"),
  estado_empresa: z.string().optional().default(""),
});

export async function crearCampaniaAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string; id?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const id = await createCampania({
      nombre: parsed.data.nombre,
      asunto: parsed.data.asunto,
      cuerpo_html: parsed.data.cuerpo_html,
      segmento: parsed.data.estado_empresa ? { estado_empresa: parsed.data.estado_empresa, con_email: true } : { con_email: true },
    });
    revalidatePath("/campanias");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarCampaniaAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try { await deleteCampania(id); revalidatePath("/campanias"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}

export async function enviarCampaniaAction(id: string): Promise<{ ok: boolean; error?: string; enviados?: number; errores?: number }> {
  try { const r = await enviarCampania(id); revalidatePath("/campanias"); return { ok: true, ...r }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}
