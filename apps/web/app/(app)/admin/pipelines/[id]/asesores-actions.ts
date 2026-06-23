"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setAsesoresDePipeline } from "@/lib/db/pipeline-asesores";

const schema = z.object({
  cargas: z.array(
    z.object({
      usuario_id: z.string().uuid(),
      peso: z.number().int().min(0).max(100),
    }),
  ),
});

export async function setAsesoresPipelineAction(
  pipelineId: string,
  cargas: { usuario_id: string; peso: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse({ cargas });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const res = await setAsesoresDePipeline(pipelineId, parsed.data.cargas);
  if (res.ok) revalidatePath(`/admin/pipelines/${pipelineId}`);
  return res;
}
