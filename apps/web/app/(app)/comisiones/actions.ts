"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setComisionConfig } from "@/lib/db/comisiones";

const schema = z.object({
  rol_comercial: z.enum(["counter_jr", "counter_sr", "vendedor_externo", "gerente"]).nullable().optional().default(null),
  comision_pct: z.number().min(0).max(100).default(0),
  meta_mensual: z.number().nonnegative().nullable().optional().default(null),
});

export async function setComisionConfigAction(
  usuarioId: string,
  input: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await setComisionConfig(usuarioId, {
      rol_comercial: parsed.data.rol_comercial ?? null,
      comision_pct: parsed.data.comision_pct,
      meta_mensual: parsed.data.meta_mensual ?? null,
    });
    revalidatePath("/comisiones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
