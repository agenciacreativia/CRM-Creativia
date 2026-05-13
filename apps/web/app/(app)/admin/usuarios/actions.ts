"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createUsuario, updateUsuario } from "@/lib/db/mutations";

const createSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(120),
  email: z.string().trim().email("Email inválido").toLowerCase(),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  rol: z.enum(["admin", "asesor"]),
});

const updateSchema = z
  .object({
    nombre: z.string().trim().min(1, "Nombre requerido").max(120),
    rol: z.enum(["admin", "asesor"]),
    activo: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
    password: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  })
  .refine((d) => !d.password || d.password.length >= 8, {
    message: "Si cambiás password, mínimo 8 caracteres",
    path: ["password"],
  });

export type UsuarioActionState = { ok: boolean; fieldErrors?: Record<string, string>; error?: string };

export async function createUsuarioAction(
  _prev: UsuarioActionState,
  formData: FormData,
): Promise<UsuarioActionState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, fieldErrors };
  }
  try {
    await createUsuario(parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function updateUsuarioAction(
  id: string,
  _prev: UsuarioActionState,
  formData: FormData,
): Promise<UsuarioActionState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, fieldErrors };
  }
  try {
    await updateUsuario(id, parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: true };
}
