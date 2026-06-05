"use server";

import { responderNps } from "@/lib/db/nps";

export async function responderNpsAction(
  token: string,
  puntaje: number,
  comentario: string,
): Promise<{ ok: boolean; error?: string }> {
  return responderNps(token, puntaje, comentario.trim() || null);
}
