"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setTenantConfig } from "@/lib/db/tenant-config";

const schema = z.object({
  rfm_oro: z.number().nonnegative(),
  rfm_plata: z.number().nonnegative(),
  tc_moneda: z.string().trim().max(8).optional().default(""),
  tc_valor: z.number().nonnegative().optional().default(0),
});

export async function setConfigComercialAction(input: z.input<typeof schema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    await setTenantConfig({
      rfm: { oro: d.rfm_oro, plata: d.rfm_plata },
      tipo_cambio: d.tc_moneda && d.tc_valor ? { moneda: d.tc_moneda.toUpperCase(), valor: d.tc_valor } : undefined,
    });
    revalidatePath("/ajustes/comercial");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
