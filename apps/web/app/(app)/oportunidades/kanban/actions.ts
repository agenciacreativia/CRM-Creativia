"use server";

import { moveOportunidadToEtapa } from "@/lib/db/mutations";

/**
 * Moves an opportunity to a new stage. Used by the Kanban drag&drop.
 *
 * IMPORTANT: we deliberately do NOT revalidatePath() here. The Client
 * Component (`KanbanBoard`) applies an optimistic update before the action
 * runs and that is the source of truth once the server confirms. Adding
 * revalidatePath would trigger a full server re-render of the kanban page
 * (an additional ~900ms round-trip to São Paulo for the kanban query)
 * which makes the move feel slow even though the data is already correct.
 *
 * The other oportunidades pages (table, detail) are dynamic — the next
 * visit to them will fetch fresh data anyway.
 */
export async function moveOportunidadAction(opts: { oportunidad_id: string; etapa_id: string }) {
  try {
    await moveOportunidadToEtapa(opts);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
