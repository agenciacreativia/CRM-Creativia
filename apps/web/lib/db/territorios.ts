import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export type Territorio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  meta: number;
  moneda: string;
  activo: boolean;
  asesores: { id: string; nombre: string }[];
  ventas: number;
  cumplimiento_pct: number | null;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (u?.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

/** Territorios + ventas ganadas del mes actual + asesores asignados. Defensive: []. */
export async function listTerritorios(): Promise<Territorio[]> {
  const user = await getSessionUser();
  if (!user?.tenantId) return [];
  const supabase = await createServerSupabase();
  const { data: territorios, error } = await supabase
    .from("territorio")
    .select("id, nombre, descripcion, meta, moneda, activo")
    .eq("tenant_id", user.tenantId)
    .order("nombre");
  if (error) return [];

  const { data: usuarios } = await supabase
    .from("usuario")
    .select("id, nombre, territorio_id")
    .eq("tenant_id", user.tenantId)
    .not("territorio_id", "is", null);

  // Ventas del mes en curso por asesor → agrupadas por territorio.
  const now = new Date();
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString();
  const { data: ganadas } = await supabase
    .from("oportunidad")
    .select("asignado_id, valor")
    .eq("estado", "ganado")
    .eq("tenant_id", user.tenantId)
    .gte("actualizado_en", from)
    .lt("actualizado_en", to);

  const ventasPorAsesor = new Map<string, number>();
  for (const o of ganadas ?? []) {
    const id = o.asignado_id as string | null;
    if (!id) continue;
    ventasPorAsesor.set(id, (ventasPorAsesor.get(id) ?? 0) + ((o.valor as number) ?? 0));
  }

  // Pre-agrupamos asesores por territorio para evitar O(territorios * usuarios) al filtrar.
  const asesoresPorTerritorio = new Map<string, { id: string; nombre: string }[]>();
  for (const u of (usuarios ?? []) as { id: string; nombre: string; territorio_id: string | null }[]) {
    if (!u.territorio_id) continue;
    const arr = asesoresPorTerritorio.get(u.territorio_id);
    const entry = { id: u.id, nombre: u.nombre };
    if (arr) arr.push(entry);
    else asesoresPorTerritorio.set(u.territorio_id, [entry]);
  }

  return (territorios ?? []).map((t: { id: string; nombre: string; descripcion: string | null; meta: number; moneda: string; activo: boolean }) => {
    const asesores = asesoresPorTerritorio.get(t.id) ?? [];
    const ventas = asesores.reduce((s, a) => s + (ventasPorAsesor.get(a.id) ?? 0), 0);
    const cumplimiento_pct = t.meta > 0 ? Math.round((ventas / t.meta) * 100) : null;
    return { id: t.id, nombre: t.nombre, descripcion: t.descripcion, meta: Number(t.meta) || 0, moneda: t.moneda, activo: t.activo, asesores, ventas, cumplimiento_pct };
  });
}

export type TerritorioInput = { nombre: string; descripcion: string | null; meta: number; moneda: string; activo: boolean };

export async function createTerritorio(input: TerritorioInput): Promise<string> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("territorio")
    .insert({ ...input, tenant_id: caller.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateTerritorio(id: string, input: TerritorioInput): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("territorio").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTerritorio(id: string): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("territorio").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setUsuarioTerritorio(usuarioId: string, territorioId: string | null): Promise<void> {
  await ensureAdmin();
  const admin = createAdminSupabase();
  const { error } = await admin.from("usuario").update({ territorio_id: territorioId }).eq("id", usuarioId);
  if (error) throw new Error(error.message);
}

export async function listAsesoresParaTerritorios(): Promise<{ id: string; nombre: string; territorio_id: string | null }[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("usuario")
    .select("id, nombre, territorio_id")
    .eq("activo", true)
    .order("nombre");
  return (data ?? []) as { id: string; nombre: string; territorio_id: string | null }[];
}
