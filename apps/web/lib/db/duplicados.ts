import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export type DupContacto = { id: string; nombre: string; email: string; empresa_nombre: string | null; oportunidades: number };
export type DupEmpresa = { id: string; nombre: string; ciudad: string | null; contactos: number; oportunidades: number };
export type Grupo<T> = { clave: string; items: T[] };

function norm(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

/** Contacts sharing the same email. */
export async function findDuplicadosContactos(): Promise<Grupo<DupContacto>[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contacto")
    // Embed explícito via FK principal (mig 0042 introdujo ambigüedad).
    .select("id, nombre, email, empresa:empresa!contacto_empresa_id_fkey(nombre), oportunidad(count)")
    .not("email", "is", null)
    .neq("email", "");
  if (error) return [];
  const map = new Map<string, DupContacto[]>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const email = String(r.email ?? "");
    if (!email) continue;
    const emp = Array.isArray(r.empresa) ? r.empresa[0] : r.empresa;
    const opp = Array.isArray(r.oportunidad) ? r.oportunidad[0] : r.oportunidad;
    const item: DupContacto = {
      id: r.id as string,
      nombre: r.nombre as string,
      email,
      empresa_nombre: (emp as { nombre: string } | null)?.nombre ?? null,
      oportunidades: (opp as { count: number } | undefined)?.count ?? 0,
    };
    const key = norm(email);
    (map.get(key) ?? map.set(key, []).get(key)!).push(item);
  }
  return [...map.entries()].filter(([, v]) => v.length > 1).map(([clave, items]) => ({ clave, items }));
}

/** Companies sharing the same normalized name. */
export async function findDuplicadosEmpresas(): Promise<Grupo<DupEmpresa>[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("empresa")
    // Embed explícito desde empresa (mig 0042 introdujo ambigüedad).
    .select("id, nombre, ciudad, contacto:contacto!contacto_empresa_id_fkey(count), oportunidad(count)");
  if (error) return [];
  const map = new Map<string, DupEmpresa[]>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const c = Array.isArray(r.contacto) ? r.contacto[0] : r.contacto;
    const o = Array.isArray(r.oportunidad) ? r.oportunidad[0] : r.oportunidad;
    const item: DupEmpresa = {
      id: r.id as string,
      nombre: r.nombre as string,
      ciudad: (r.ciudad as string | null) ?? null,
      contactos: (c as { count: number } | undefined)?.count ?? 0,
      oportunidades: (o as { count: number } | undefined)?.count ?? 0,
    };
    const key = norm(item.nombre);
    (map.get(key) ?? map.set(key, []).get(key)!).push(item);
  }
  return [...map.entries()].filter(([, v]) => v.length > 1).map(([clave, items]) => ({ clave, items }));
}

/** Merge a duplicate contact into a primary: reassign references, delete dup. */
export async function mergeContactos(primaryId: string, dupId: string): Promise<void> {
  const user = await ensureAdmin();
  if (primaryId === dupId) throw new Error("Contactos iguales");
  const admin = createAdminSupabase();
  const t = user.tenantId;
  await admin.from("oportunidad").update({ contacto_id: primaryId }).eq("contacto_id", dupId).eq("tenant_id", t);
  await admin.from("nota").update({ contacto_id: primaryId }).eq("contacto_id", dupId).eq("tenant_id", t);
  await admin.from("documento").update({ entity_id: primaryId }).eq("entity_id", dupId).eq("entidad", "contacto").eq("tenant_id", t);
  const { error } = await admin.from("contacto").delete().eq("id", dupId).eq("tenant_id", t);
  if (error) throw new Error(error.message);
}

/** Merge a duplicate company into a primary: reassign references, delete dup. */
export async function mergeEmpresas(primaryId: string, dupId: string): Promise<void> {
  const user = await ensureAdmin();
  if (primaryId === dupId) throw new Error("Empresas iguales");
  const admin = createAdminSupabase();
  const t = user.tenantId;
  await admin.from("contacto").update({ empresa_id: primaryId }).eq("empresa_id", dupId).eq("tenant_id", t);
  await admin.from("oportunidad").update({ empresa_id: primaryId }).eq("empresa_id", dupId).eq("tenant_id", t);
  await admin.from("nota").update({ empresa_id: primaryId }).eq("empresa_id", dupId).eq("tenant_id", t);
  await admin.from("documento").update({ entity_id: primaryId }).eq("entity_id", dupId).eq("entidad", "empresa").eq("tenant_id", t);
  await admin.from("sede").update({ empresa_id: primaryId }).eq("empresa_id", dupId).eq("tenant_id", t);
  const { error } = await admin.from("empresa").delete().eq("id", dupId).eq("tenant_id", t);
  if (error) throw new Error(error.message);
}
