"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateOportunidad, logCambio } from "@/lib/db/mutations";
import { getOportunidad } from "@/lib/db/oportunidades";

const emptyToNull = (v: unknown) => {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};
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

export type OportunidadFormState = { ok: boolean; fieldErrors?: Record<string, string>; error?: string };

export async function updateOportunidadAction(
  id: string,
  _prev: OportunidadFormState,
  formData: FormData,
): Promise<OportunidadFormState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, fieldErrors };
  }
  // Bloquear edición si la oportunidad está eliminada (soft delete, 30 días).
  const actual = await getOportunidad(id);
  if (actual && actual.estado === "eliminado") {
    return { ok: false, error: "La oportunidad está en estado Eliminada y no se puede editar. Restaurala antes de modificarla." };
  }
  try {
    await updateOportunidad(id, parsed.data);
    await logCambio("oportunidad", id, "Editó la oportunidad (formulario)");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath(`/oportunidades`);
  revalidatePath(`/oportunidades/kanban`);
  redirect(`/oportunidades/${id}`);
}
