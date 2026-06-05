"use server";

import { revalidatePath } from "next/cache";
import { crearEnvioNps } from "@/lib/db/nps";

export async function enviarNpsAction(
  oportunidadId: string,
  contactoId: string | null,
): Promise<{ ok: boolean; error?: string; url?: string }> {
  try {
    const { url } = await crearEnvioNps(oportunidadId, contactoId);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
