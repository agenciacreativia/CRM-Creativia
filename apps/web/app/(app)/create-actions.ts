"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEmpresa, createContacto, createOportunidad, logCambio } from "@/lib/db/mutations";

/** Shared result shape for modal create flows — never redirects. */
export type CreateState = {
  ok: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

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

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[issue.path.join(".")] = issue.message;
  return out;
}

/** Collect custom-field inputs (named `cc__<clave>`) into a campos_custom object. */
function collectCamposCustom(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("cc__")) continue;
    const clave = k.slice(4);
    if (v === "true") out[clave] = true;
    else if (typeof v === "string" && v.trim() !== "") out[clave] = v;
  }
  return out;
}

/* ---------------- Empresa ---------------- */

const empresaSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(200),
  email: z.preprocess(emptyToNull, z.string().email("Email inválido").nullable()),
  telefono: z.preprocess(emptyToNull, z.string().max(40).nullable()),
  sitio_web: z.preprocess(emptyToNull, z.string().max(200).nullable()),
  direccion: z.preprocess(emptyToNull, z.string().max(300).nullable()),
  ciudad: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  pais: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  descripcion: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  estado_empresa: z.enum(["prospecto", "cliente", "inactivo"]),
  origen: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["web", "referencia", "cold_call", "evento", "otro"]).nullable(),
  ),
  asignado_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
});

export async function createEmpresaAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const parsed = empresaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    const id = await createEmpresa(parsed.data, collectCamposCustom(formData));
    await logCambio("empresa", id, "Creó la empresa");
    revalidatePath("/empresas");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/* ---------------- Contacto ---------------- */

const contactoSchema = z.object({
  empresa_id: z.string().uuid("Empresa requerida"),
  nombre: z.string().trim().min(1, "Nombre requerido").max(200),
  cargo: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  email: z.string().trim().email("Email inválido"),
  telefono: z.preprocess(emptyToNull, z.string().max(40).nullable()),
  telefono_whatsapp: z.preprocess(emptyToNull, z.string().max(40).nullable()),
  descripcion: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  origen: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["empresa", "linkedin", "cold_call", "evento", "otro"]).nullable(),
  ),
  asignado_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
});

export async function createContactoAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const parsed = contactoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    const id = await createContacto(parsed.data, collectCamposCustom(formData));
    await logCambio("contacto", id, "Creó el contacto");
    revalidatePath("/contactos");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/* ---------------- Oportunidad ---------------- */

const oportunidadSchema = z
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

export async function createOportunidadAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const parsed = oportunidadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    const id = await createOportunidad(parsed.data, collectCamposCustom(formData));
    await logCambio("oportunidad", id, "Creó la oportunidad");
    revalidatePath("/oportunidades");
    revalidatePath("/oportunidades/kanban");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
