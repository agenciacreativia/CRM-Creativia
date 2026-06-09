"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createPipeline,
  updatePipeline,
  deletePipeline,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  reorderEtapas,
} from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const numOrNull = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const pipelineSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  descripcion: z.preprocess(emptyToNull, z.string().max(500).nullable()),
});

const etapaSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  orden: z.preprocess(numOrNull, z.number().int().nonnegative().nullable()),
  // Limite maximo de 365 dias para evitar overflow visual en el kanban
  dias_maximo_alerta: z.preprocess(numOrNull, z.number().int().positive().max(365).nullable()),
});

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createPipelineAction(formData: FormData): Promise<ActionResult> {
  const parsed = pipelineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const id = await createPipeline(parsed.data);
    revalidatePath("/admin/pipelines");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updatePipelineAction(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = pipelineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await updatePipeline(id, parsed.data);
    revalidatePath("/admin/pipelines");
    revalidatePath(`/admin/pipelines/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deletePipelineAction(id: string): Promise<ActionResult> {
  try {
    await deletePipeline(id);
    revalidatePath("/admin/pipelines");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createEtapaAction(
  pipeline_id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = etapaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const id = await createEtapa({
      pipeline_id,
      nombre: parsed.data.nombre,
      orden: parsed.data.orden ?? 999,
      dias_maximo_alerta: parsed.data.dias_maximo_alerta,
    });
    revalidatePath(`/admin/pipelines/${pipeline_id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateEtapaAction(
  id: string,
  pipeline_id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = etapaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await updateEtapa(id, {
      nombre: parsed.data.nombre,
      orden: parsed.data.orden ?? 0,
      dias_maximo_alerta: parsed.data.dias_maximo_alerta,
    });
    revalidatePath(`/admin/pipelines/${pipeline_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteEtapaAction(id: string, pipeline_id: string): Promise<ActionResult> {
  try {
    await deleteEtapa(id);
    revalidatePath(`/admin/pipelines/${pipeline_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function reorderEtapasAction(pipeline_id: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    await reorderEtapas(pipeline_id, orderedIds);
    revalidatePath(`/admin/pipelines/${pipeline_id}`);
    revalidatePath(`/oportunidades/kanban`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
