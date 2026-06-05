"use server";

import { revalidatePath } from "next/cache";
import { inscribirEnSecuencia } from "@/lib/db/secuencias";
import { logCambio } from "@/lib/db/mutations";

export async function inscribirAction(
  secuenciaId: string,
  oportunidadId: string,
): Promise<{ ok: boolean; error?: string; creadas?: number }> {
  try {
    const creadas = await inscribirEnSecuencia(secuenciaId, oportunidadId);
    await logCambio("oportunidad", oportunidadId, `Inscribió en una secuencia (${creadas} actividades)`);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true, creadas };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
