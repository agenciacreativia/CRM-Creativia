"use server";

import { revalidatePath } from "next/cache";
import { moveOportunidadToEtapa } from "@/lib/db/mutations";

export async function moveOportunidadAction(opts: { oportunidad_id: string; etapa_id: string }) {
  try {
    await moveOportunidadToEtapa(opts);
    revalidatePath("/oportunidades/kanban");
    revalidatePath("/oportunidades");
    revalidatePath(`/oportunidades/${opts.oportunidad_id}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
