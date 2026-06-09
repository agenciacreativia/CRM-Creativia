import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { normalizePermisos, PERMISSION_MODULES, type Permisos, type ModuleKey, type ModulePerms } from "@/lib/permissions";
import { getTenantCapabilities } from "@/lib/db/planes";

export type Rol = {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_admin: boolean;
  es_sistema: boolean;
  permisos: Record<ModuleKey, ModulePerms>;
  usuarios_count: number;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores pueden gestionar roles");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

/** List roles for the current tenant with a count of assigned users. Defensive: [] pre-0018. */
export async function listRoles(): Promise<Rol[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rol")
    .select("id, nombre, descripcion, es_admin, es_sistema, permisos, usuario(count)")
    .order("es_admin", { ascending: false })
    .order("nombre");
  if (error) return [];
  return (data ?? []).map((r: {
    id: string;
    nombre: string;
    descripcion: string | null;
    es_admin: boolean;
    es_sistema: boolean;
    permisos: Permisos | null;
    usuario?: { count: number }[];
  }) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    es_admin: r.es_admin,
    es_sistema: r.es_sistema,
    permisos: normalizePermisos(r.permisos),
    usuarios_count: r.usuario?.[0]?.count ?? 0,
  }));
}

/** Permissions for a given role id (used to gate the current user). */
export async function getRolPermisos(
  rolId: string | null,
): Promise<{ permisos: Permisos; es_admin: boolean } | null> {
  if (!rolId) return null;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rol")
    .select("permisos, es_admin")
    .eq("id", rolId)
    .maybeSingle();
  if (error || !data) return null;
  return { permisos: (data.permisos as Permisos) ?? {}, es_admin: !!data.es_admin };
}

/**
 * Effective permissions for the signed-in user = role ∩ plan ceiling.
 *
 * The plan caps everything (even admins): a Lite agency admin can't access
 * modules the plan excludes. When the tenant has no plan ceiling (the
 * platform tenant), the role permissions pass through unchanged.
 */
export async function getMyPermisos(): Promise<{ permisos: Permisos; es_admin: boolean }> {
  const u = await getSessionUser();
  if (!u) return { permisos: {}, es_admin: false };

  // ---- Role side ----
  let roleEsAdmin = false;
  let rolePermisos: Permisos = {};
  if (u.rol === "admin") {
    roleEsAdmin = true;
  } else {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("usuario").select("rol_id").eq("id", u.id).maybeSingle();
    const res = await getRolPermisos((data?.rol_id as string | null) ?? null);
    if (res) {
      roleEsAdmin = res.es_admin;
      rolePermisos = res.permisos;
    }
  }

  // ---- Plan ceiling ----
  const cap = await getTenantCapabilities();
  if (cap.sinTecho || !cap.modulos) {
    return { permisos: rolePermisos, es_admin: roleEsAdmin };
  }

  // Intersect role ∩ plan into a concrete matrix (admin folded in → es_admin=false).
  const eff: Record<ModuleKey, ModulePerms> = {} as Record<ModuleKey, ModulePerms>;
  for (const m of PERMISSION_MODULES) {
    const planRow = cap.modulos[m.key];
    const roleRow = rolePermisos[m.key];
    eff[m.key] = {
      ver: planRow.ver && (roleEsAdmin || !!roleRow?.ver),
      crear: planRow.crear && (roleEsAdmin || !!roleRow?.crear),
      editar: planRow.editar && (roleEsAdmin || !!roleRow?.editar),
      eliminar: planRow.eliminar && (roleEsAdmin || !!roleRow?.eliminar),
    };
  }
  return { permisos: eff, es_admin: false };
}

export type RolInput = {
  nombre: string;
  descripcion: string | null;
  es_admin: boolean;
  permisos: Record<ModuleKey, ModulePerms>;
};

export async function createRol(input: RolInput): Promise<string> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rol")
    .insert({
      tenant_id: caller.tenantId,
      nombre: input.nombre,
      descripcion: input.descripcion,
      es_admin: input.es_admin,
      es_sistema: false,
      permisos: input.permisos,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateRol(id: string, input: RolInput): Promise<void> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("rol")
    .update({
      nombre: input.nombre,
      descripcion: input.descripcion,
      es_admin: input.es_admin,
      permisos: input.permisos,
    })
    .eq("id", id)
    .eq("tenant_id", caller.tenantId);
  if (error) throw new Error(error.message);
  // Sync limitado al tenant del caller (no toca usuarios de otros tenants).
  await syncUsuariosLegacyRol(id, input.es_admin, caller.tenantId!);
}

export async function deleteRol(id: string): Promise<void> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { data: rol } = await supabase
    .from("rol")
    .select("es_sistema, usuario(count)")
    .eq("id", id)
    .eq("tenant_id", caller.tenantId)
    .maybeSingle();
  if (!rol) throw new Error("Rol no encontrado");
  if (rol.es_sistema) throw new Error("No se puede eliminar un rol del sistema");
  const count = (rol.usuario as { count: number }[] | undefined)?.[0]?.count ?? 0;
  if (count > 0) throw new Error("Reasigná los usuarios antes de eliminar este rol");
  const { error } = await supabase.from("rol").delete().eq("id", id).eq("tenant_id", caller.tenantId);
  if (error) throw new Error(error.message);
}

/** Assign a role to a user: sets rol_id, syncs legacy text rol + auth metadata. */
export async function setUsuarioRol(usuarioId: string, rolId: string): Promise<void> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  // Garantizamos que el rol pertenece al mismo tenant que el caller.
  const { data: rol } = await supabase
    .from("rol")
    .select("es_admin, nombre, tenant_id")
    .eq("id", rolId)
    .eq("tenant_id", caller.tenantId)
    .maybeSingle();
  if (!rol) throw new Error("Rol no encontrado en tu cuenta");

  // Y también que el usuario destino pertenece al mismo tenant.
  const admin = createAdminSupabase();
  const { data: target } = await admin
    .from("usuario")
    .select("id, tenant_id, nombre")
    .eq("id", usuarioId)
    .eq("tenant_id", caller.tenantId)
    .maybeSingle();
  if (!target) throw new Error("Usuario no encontrado en tu cuenta");

  // Lockout protection: an admin can't strip their own admin access.
  if (usuarioId === caller.id && !rol.es_admin) {
    throw new Error("No podés quitarte a vos mismo el rol de administrador");
  }

  const legacy = rol.es_admin ? "admin" : "asesor";
  const { error } = await admin
    .from("usuario")
    .update({ rol_id: rolId, rol: legacy })
    .eq("id", usuarioId)
    .eq("tenant_id", caller.tenantId);
  if (error) throw new Error(error.message);

  await admin.auth.admin.updateUserById(usuarioId, {
    user_metadata: { nombre: target.nombre, tenant_id: caller.tenantId, rol: legacy },
  });
}

/** Re-sync the legacy text rol of all users holding `rolId` — filtrado por tenant. */
async function syncUsuariosLegacyRol(rolId: string, esAdmin: boolean, tenantId: string): Promise<void> {
  const admin = createAdminSupabase();
  const legacy = esAdmin ? "admin" : "asesor";
  const { data: usuarios } = await admin
    .from("usuario")
    .select("id, nombre, tenant_id")
    .eq("rol_id", rolId)
    .eq("tenant_id", tenantId);
  for (const u of usuarios ?? []) {
    await admin.from("usuario").update({ rol: legacy }).eq("id", u.id);
    await admin.auth.admin.updateUserById(u.id as string, {
      user_metadata: { nombre: u.nombre, tenant_id: u.tenant_id, rol: legacy },
    });
  }
}
