"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { getMyPermisos } from "@/lib/db/roles";
import { getEditableFields, type ModuloBulk } from "@/lib/bulk/editable-fields";
import type { FilterField } from "@/lib/filters/types";

type Result = { ok: boolean; afectados?: number; error?: string };

const MODULO_META: Record<ModuloBulk, { tabla: string; recurso: "empresas" | "contactos" | "oportunidades" | "productos"; path: string }> = {
  empresas: { tabla: "empresa", recurso: "empresas", path: "/empresas" },
  contactos: { tabla: "contacto", recurso: "contactos", path: "/contactos" },
  oportunidades: { tabla: "oportunidad", recurso: "oportunidades", path: "/oportunidades" },
  productos: { tabla: "producto", recurso: "productos", path: "/productos" },
};

const payloadSchema = z.object({
  modulo: z.enum(["empresas", "contactos", "oportunidades", "productos"]),
  ids: z.array(z.string().uuid()).min(1).max(500),
  cambios: z
    .array(z.object({ field: z.string().min(1).max(64), value: z.string().max(2000) }))
    .min(1)
    .max(50),
});

/** Coerce el valor string del form al tipo del campo. */
function coerce(field: FilterField, raw: string): unknown {
  const v = raw.trim();
  if (field.key === "asignado_id" && (v === "" || v === "__null__")) return null;
  switch (field.type) {
    case "numero": {
      if (v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    case "booleano":
      return v === "true" || v === "si" || v === "1";
    case "fecha":
      return v === "" ? null : v;
    case "seleccion":
    case "texto":
    default:
      return v === "" ? null : v;
  }
}

/**
 * Actualización masiva genérica: aplica `cambios` (cualquier campo editable del
 * módulo, nativo o personalizado) a todos los `ids`. Valida los campos contra el
 * catálogo del servidor (evita mass-assignment), chequea permiso y acota por
 * tenant. Nativos via UPDATE directo; personalizados via RPC (merge jsonb).
 */
export async function bulkActualizarAction(
  modulo: ModuloBulk,
  ids: string[],
  cambios: { field: string; value: string }[],
): Promise<Result> {
  const parsed = payloadSchema.safeParse({ modulo, ids, cambios });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "No autenticado" };
  if (!user.tenantId) return { ok: false, error: "Tenant ausente" };

  const meta = MODULO_META[modulo];
  const perms = await getMyPermisos();
  if (!can(perms.permisos, meta.recurso, "editar", perms.es_admin)) {
    return { ok: false, error: `Sin permiso para editar ${meta.recurso}` };
  }

  // Catálogo de campos válidos del servidor — no confiamos en el cliente.
  const fields = await getEditableFields(modulo);
  const byKey = new Map(fields.map((f) => [f.key, f]));

  const nativePatch: Record<string, unknown> = {};
  const customPatch: Record<string, unknown> = {};
  for (const c of parsed.data.cambios) {
    const field = byKey.get(c.field);
    if (!field) return { ok: false, error: `Campo no editable: ${c.field}` };
    const value = coerce(field, c.value);
    if (field.custom) customPatch[field.key] = value;
    else nativePatch[field.key] = value;
  }

  if (Object.keys(nativePatch).length === 0 && Object.keys(customPatch).length === 0) {
    return { ok: false, error: "Nada para actualizar" };
  }

  const admin = createAdminSupabase();
  let afectados = 0;

  if (Object.keys(nativePatch).length > 0) {
    const { error, count } = await admin
      .from(meta.tabla)
      .update(nativePatch, { count: "exact" })
      .in("id", parsed.data.ids)
      .eq("tenant_id", user.tenantId);
    if (error) return { ok: false, error: error.message };
    afectados = count ?? 0;
  }

  if (Object.keys(customPatch).length > 0) {
    const { data, error } = await admin.rpc("bulk_set_campos_custom", {
      p_tabla: meta.tabla,
      p_ids: parsed.data.ids,
      p_tenant: user.tenantId,
      p_patch: customPatch,
    });
    if (error) return { ok: false, error: error.message };
    if (typeof data === "number") afectados = Math.max(afectados, data);
  }

  revalidatePath(meta.path);
  return { ok: true, afectados };
}
