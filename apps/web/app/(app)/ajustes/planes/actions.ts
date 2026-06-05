"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPlan, updatePlan, deletePlan, setPlanActivo } from "@/lib/db/planes";
import { PLAN_MODULES, HERRAMIENTAS, LIMITES, type PlanModulos } from "@/lib/plans";

export type PlanResult = { ok: boolean; error?: string; id?: string };

const permMod = z.object({
  ver: z.boolean().default(false),
  crear: z.boolean().default(false),
  editar: z.boolean().default(false),
  eliminar: z.boolean().default(false),
});

const schema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(60),
  descripcion: z.string().trim().max(500).nullable().optional().default(null),
  precio: z.number().nonnegative().default(0),
  moneda: z.string().trim().max(8).default("USD"),
  periodicidad: z.enum(["mensual", "anual", "unico"]).default("mensual"),
  modulos: z.record(z.string(), permMod),
  herramientas: z.record(z.string(), z.boolean()),
  limites: z.record(z.string(), z.number().nullable()),
  activo: z.boolean().default(true),
  orden: z.number().int().default(0),
});

export type PlanPayload = z.input<typeof schema>;

function normalize(payload: PlanPayload) {
  const d = schema.parse(payload);
  const modulos = {} as PlanModulos;
  for (const m of PLAN_MODULES) {
    const p = d.modulos[m.key] ?? {};
    modulos[m.key] = { ver: !!p.ver, crear: !!p.crear, editar: !!p.editar, eliminar: !!p.eliminar };
  }
  const herramientas: Record<string, boolean> = {};
  for (const h of HERRAMIENTAS) herramientas[h.key] = !!d.herramientas[h.key];
  const limites: Record<string, number | null> = {};
  for (const l of LIMITES) {
    const v = d.limites[l.key];
    limites[l.key] = v === undefined ? null : v;
  }
  return {
    nombre: d.nombre,
    descripcion: d.descripcion ?? null,
    precio: d.precio,
    moneda: d.moneda,
    periodicidad: d.periodicidad,
    modulos,
    herramientas,
    limites,
    activo: d.activo,
    orden: d.orden,
  };
}

export async function createPlanAction(payload: PlanPayload): Promise<PlanResult> {
  try {
    const id = await createPlan(normalize(payload));
    revalidatePath("/ajustes/planes");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updatePlanAction(id: string, payload: PlanPayload): Promise<PlanResult> {
  try {
    await updatePlan(id, normalize(payload));
    revalidatePath("/ajustes/planes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function togglePlanAction(id: string, activo: boolean): Promise<PlanResult> {
  try {
    await setPlanActivo(id, activo);
    revalidatePath("/ajustes/planes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deletePlanAction(id: string): Promise<PlanResult> {
  try {
    await deletePlan(id);
    revalidatePath("/ajustes/planes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
