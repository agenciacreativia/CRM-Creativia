"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createContacto, logCambio } from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

const schema = z.object({
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
  fecha_nacimiento: z.preprocess(
    emptyToNull,
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)")
      .nullable(),
  ),
});

export type ContactoCreateState = { ok: boolean; id?: string; fieldErrors?: Record<string, string>; error?: string };

export async function createContactoAction(
  _prev: ContactoCreateState,
  formData: FormData,
): Promise<ContactoCreateState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, fieldErrors };
  }

  let id: string;
  try {
    id = await createContacto(parsed.data);
    await logCambio("contacto", id, "Creó el contacto");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath("/contactos");
  revalidatePath(`/empresas/${parsed.data.empresa_id}`);
  return { ok: true, id };
}
