"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { getMyPermisos } from "@/lib/db/roles";

async function ensureSession() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

type Result = { ok: boolean; afectados?: number; error?: string };

/**
 * Reasignar masivamente: setea asignado_id en todas las empresas seleccionadas.
 * Usa admin client porque queremos saltear RLS de un asesor que no es
 * el propietario actual (chequeo de permiso primero).
 */
export async function bulkReasignarEmpresasAction(ids: string[], asignadoId: string | null): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "empresas", "editar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para editar empresas" };
  }
  const admin = createAdminSupabase();
  const { error, count } = await admin
    .from("empresa")
    .update({ asignado_id: asignadoId }, { count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/empresas");
  return { ok: true, afectados: count ?? 0 };
}

export async function bulkCambiarEstadoEmpresasAction(
  ids: string[],
  estado: "prospecto" | "cliente" | "inactivo",
): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "empresas", "editar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para editar empresas" };
  }
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("empresa")
    .update({ estado_empresa: estado }, { count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/empresas");
  return { ok: true, afectados: count ?? 0 };
}
