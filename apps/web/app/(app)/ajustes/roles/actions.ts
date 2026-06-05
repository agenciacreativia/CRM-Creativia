"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRol, updateRol, deleteRol, setUsuarioRol } from "@/lib/db/roles";
import { createInvitacion, cancelInvitacion } from "@/lib/db/invitaciones";
import { PERMISSION_MODULES } from "@/lib/permissions";

export type ActionResult = { ok: boolean; error?: string; id?: string; link?: string; emailed?: boolean };

const moduleKeys = PERMISSION_MODULES.map((m) => m.key) as [string, ...string[]];
const permModSchema = z.object({
  ver: z.boolean().default(false),
  crear: z.boolean().default(false),
  editar: z.boolean().default(false),
  eliminar: z.boolean().default(false),
});
const rolSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(60),
  descripcion: z.string().trim().max(300).nullable().optional().default(null),
  es_admin: z.boolean().default(false),
  permisos: z.record(z.enum(moduleKeys), permModSchema),
});

export type RolPayload = z.input<typeof rolSchema>;

function normalize(payload: RolPayload) {
  const parsed = rolSchema.parse(payload);
  // Ensure every module is present.
  const permisos = {} as Record<string, { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }>;
  for (const m of PERMISSION_MODULES) {
    const p = parsed.permisos[m.key] ?? {};
    permisos[m.key] = { ver: !!p.ver, crear: !!p.crear, editar: !!p.editar, eliminar: !!p.eliminar };
  }
  return { ...parsed, descripcion: parsed.descripcion ?? null, permisos };
}

export async function createRolAction(payload: RolPayload): Promise<ActionResult> {
  try {
    const d = normalize(payload);
    const id = await createRol(d);
    revalidatePath("/ajustes/roles");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateRolAction(id: string, payload: RolPayload): Promise<ActionResult> {
  try {
    const d = normalize(payload);
    await updateRol(id, d);
    revalidatePath("/ajustes/roles");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteRolAction(id: string): Promise<ActionResult> {
  try {
    await deleteRol(id);
    revalidatePath("/ajustes/roles");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function setUsuarioRolAction(usuarioId: string, rolId: string): Promise<ActionResult> {
  try {
    await setUsuarioRol(usuarioId, rolId);
    revalidatePath("/ajustes/roles");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

const inviteSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  nombre: z.string().trim().max(120).nullable().optional().default(null),
  rol_id: z.string().uuid("Elegí un rol"),
});

export async function createInvitacionAction(payload: z.input<typeof inviteSchema>): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const res = await createInvitacion({
      email: parsed.data.email,
      nombre: parsed.data.nombre ?? null,
      rol_id: parsed.data.rol_id,
    });
    revalidatePath("/ajustes/roles");
    return { ok: true, id: res.id, link: res.link, emailed: res.emailed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function cancelInvitacionAction(id: string): Promise<ActionResult> {
  try {
    await cancelInvitacion(id);
    revalidatePath("/ajustes/roles");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
