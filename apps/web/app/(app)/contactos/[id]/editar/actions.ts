"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateContacto, logCambio } from "@/lib/db/mutations";

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
      .refine((s) => {
        const d = new Date(s + "T00:00:00Z");
        return !isNaN(d.getTime()) && d.getUTCFullYear() >= 1900 && d.getTime() <= Date.now();
      }, "La fecha de nacimiento debe estar entre 1900 y hoy")
      .nullable(),
  ),
});

export type ContactoFormState = { ok: boolean; id?: string; fieldErrors?: Record<string, string>; error?: string };

export async function updateContactoAction(
  id: string,
  _prev: ContactoFormState,
  formData: FormData,
): Promise<ContactoFormState> {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  try {
    await updateContacto(id, parsed.data);
    await logCambio("contacto", id, "Editó el contacto (formulario)");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath(`/contactos/${id}`);
  revalidatePath(`/contactos`);
  // El cliente navega cuando ve ok:true (ver useEffect en contacto-form).
  return { ok: true, id };
}
