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

export async function bulkReasignarContactosAction(ids: string[], asignadoId: string | null): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "contactos", "editar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para editar contactos" };
  }
  const admin = createAdminSupabase();
  const { error, count } = await admin
    .from("contacto")
    .update({ asignado_id: asignadoId }, { count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contactos");
  return { ok: true, afectados: count ?? 0 };
}

export async function bulkCambiarOrigenContactosAction(
  ids: string[],
  origen: "empresa" | "linkedin" | "cold_call" | "evento" | "otro" | null,
): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "contactos", "editar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para editar contactos" };
  }
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("contacto")
    .update({ origen }, { count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contactos");
  return { ok: true, afectados: count ?? 0 };
}

export async function bulkEliminarContactosAction(ids: string[]): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "contactos", "eliminar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para eliminar contactos" };
  }
  const admin = createAdminSupabase();
  // Bloqueamos si alguno tiene oportunidades — el bulk no resuelve reasignación.
  // Filtramos por tenant_id (admin client saltea RLS): sin esto el resultado
  // del pre-check era un oráculo de existencia de UUIDs de otros tenants.
  const { data: conOps } = await admin
    .from("oportunidad")
    .select("contacto_id")
    .in("contacto_id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!)
    .limit(1);
  if ((conOps?.length ?? 0) > 0) {
    return {
      ok: false,
      error: "Al menos un contacto tiene oportunidades. Borralos uno por uno desde su detalle para reasignar.",
    };
  }
  const { error, count } = await admin
    .from("contacto")
    .delete({ count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contactos");
  return { ok: true, afectados: count ?? 0 };
}
