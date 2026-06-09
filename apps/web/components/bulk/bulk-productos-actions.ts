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

const bulkSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });
type Result = { ok: boolean; afectados?: number; error?: string };

export async function bulkActivarProductosAction(ids: string[], activo: boolean): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "productos", "editar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para editar productos" };
  }
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("producto")
    .update({ activo }, { count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/productos", "layout");
  return { ok: true, afectados: count ?? 0 };
}

export async function bulkCambiarCategoriaProductosAction(ids: string[], categoria: string | null): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "productos", "editar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para editar productos" };
  }
  const supabase = await createServerSupabase();
  const { error, count } = await supabase
    .from("producto")
    .update({ categoria }, { count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/productos", "layout");
  return { ok: true, afectados: count ?? 0 };
}

export async function bulkEliminarProductosAction(ids: string[]): Promise<Result> {
  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const user = await ensureSession();
  const perms = await getMyPermisos();
  if (!can(perms.permisos, "productos", "eliminar", perms.es_admin)) {
    return { ok: false, error: "Sin permiso para eliminar productos" };
  }
  const admin = createAdminSupabase();
  // No borramos productos que tengan oportunidades asociadas — mostraría error
  // poco claro por la FK. Lo chequeamos antes.
  const { data: enUso } = await admin
    .from("oportunidad_producto")
    .select("producto_id")
    .in("producto_id", parsed.data.ids)
    .limit(1);
  if ((enUso?.length ?? 0) > 0) {
    return { ok: false, error: "Al menos un producto está usado en una oportunidad. Desactivalos o borralos uno por uno." };
  }
  const { error, count } = await admin
    .from("producto")
    .delete({ count: "exact" })
    .in("id", parsed.data.ids)
    .eq("tenant_id", user.tenantId!);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/productos", "layout");
  return { ok: true, afectados: count ?? 0 };
}
