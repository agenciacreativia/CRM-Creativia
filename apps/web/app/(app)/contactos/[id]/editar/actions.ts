"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateContacto } from "@/lib/db/mutations";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

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
});

export type ContactoFormState = { ok: boolean; fieldErrors?: Record<string, string>; error?: string };

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
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath(`/contactos/${id}`);
  revalidatePath(`/contactos`);
  redirect(`/contactos/${id}`);
}
