"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEmpresa, logCambio } from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

const schema = z.object({
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

export type EmpresaCreateState = { ok: boolean; id?: string; fieldErrors?: Record<string, string>; error?: string };

export async function createEmpresaAction(
  _prev: EmpresaCreateState,
  formData: FormData,
): Promise<EmpresaCreateState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, fieldErrors };
  }

  let id: string;
  try {
    id = await createEmpresa(parsed.data);
    await logCambio("empresa", id, "Creó la empresa");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath("/empresas");
  return { ok: true, id };
}
