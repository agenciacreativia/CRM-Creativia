"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createOportunidad } from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const numOrNull = (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const schema = z
  .object({
    nombre: z.string().trim().min(1, "Nombre requerido").max(200),
    empresa_id: z.string().uuid(),
    contacto_id: z.string().uuid(),
    pipeline_id: z.string().uuid(),
    etapa_id: z.string().uuid(),
    asignado_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
    valor: z.preprocess(numOrNull, z.number().nonnegative().nullable()),
    moneda: z.enum(["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"]),
    estado: z.enum(["activo", "ganado", "perdido", "eliminado"]),
    probabilidad_cierre: z.preprocess(numOrNull, z.number().int().min(0).max(100).nullable()),
    fecha_esperada_cierre: z.preprocess(emptyToNull, z.string().nullable()),
    motivo_perdida_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
    observaciones_perdida: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
    descripcion: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  })
  .refine((d) => d.estado !== "perdido" || !!d.motivo_perdida_id, {
    message: "Motivo de pérdida es requerido cuando el estado es Perdida",
    path: ["motivo_perdida_id"],
  });

export type NuevaOportunidadFormState = { ok: boolean; fieldErrors?: Record<string, string>; error?: string };

export async function createOportunidadAction(
  _prev: NuevaOportunidadFormState,
  formData: FormData,
): Promise<NuevaOportunidadFormState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, fieldErrors };
  }
  let id: string;
  try {
    id = await createOportunidad(parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
  revalidatePath(`/oportunidades`);
  revalidatePath(`/oportunidades/kanban`);
  redirect(`/oportunidades/${id}`);
}
