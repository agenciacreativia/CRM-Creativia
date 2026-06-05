import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type Etiqueta = { id: string; nombre: string; color: string };

type Entidad = "oportunidad" | "contacto" | "empresa";
const PIVOT: Record<Entidad, { table: string; col: string }> = {
  oportunidad: { table: "oportunidad_etiqueta", col: "oportunidad_id" },
  contacto: { table: "contacto_etiqueta", col: "contacto_id" },
  empresa: { table: "empresa_etiqueta", col: "empresa_id" },
};

/** All tags for the tenant. Defensive: [] if table missing (pre-0024). */
export async function listEtiquetas(): Promise<Etiqueta[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("etiqueta").select("id, nombre, color").order("nombre");
  if (error) return [];
  return (data ?? []) as Etiqueta[];
}

/** Tags assigned to one entity. Defensive: []. */
export async function listEtiquetasDe(entidad: Entidad, entityId: string): Promise<Etiqueta[]> {
  const supabase = await createServerSupabase();
  const { table, col } = PIVOT[entidad];
  const { data, error } = await supabase
    .from(table)
    .select("etiqueta(id, nombre, color)")
    .eq(col, entityId);
  if (error) return [];
  return (data ?? [])
    .map((r: { etiqueta: Etiqueta | Etiqueta[] | null }) => (Array.isArray(r.etiqueta) ? r.etiqueta[0] : r.etiqueta))
    .filter((e): e is Etiqueta => !!e);
}

/** Map of entity id -> tags, for list rendering. Defensive: {}. */
export async function etiquetasPorEntidad(
  entidad: Entidad,
  ids: string[],
): Promise<Record<string, Etiqueta[]>> {
  if (ids.length === 0) return {};
  const supabase = await createServerSupabase();
  const { table, col } = PIVOT[entidad];
  const { data, error } = await supabase
    .from(table)
    .select(`${col}, etiqueta(id, nombre, color)`)
    .in(col, ids);
  if (error) return {};
  const out: Record<string, Etiqueta[]> = {};
  for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
    const key = r[col] as string;
    const e = (Array.isArray(r.etiqueta) ? r.etiqueta[0] : r.etiqueta) as Etiqueta | null;
    if (!e) continue;
    (out[key] ??= []).push(e);
  }
  return out;
}

export async function createEtiqueta(nombre: string, color: string): Promise<Etiqueta> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("etiqueta")
    .insert({ tenant_id: user.tenantId, nombre: nombre.trim(), color })
    .select("id, nombre, color")
    .single();
  if (error) throw new Error(error.message);
  return data as Etiqueta;
}

export async function deleteEtiqueta(id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("etiqueta").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Replace the set of tags assigned to an entity. */
export async function setEtiquetasDe(entidad: Entidad, entityId: string, etiquetaIds: string[]): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { table, col } = PIVOT[entidad];
  const { error: delErr } = await supabase.from(table).delete().eq(col, entityId);
  if (delErr) throw new Error(delErr.message);
  if (etiquetaIds.length > 0) {
    const rows = etiquetaIds.map((etiqueta_id) => ({ [col]: entityId, etiqueta_id, tenant_id: user.tenantId }));
    const { error: insErr } = await supabase.from(table).insert(rows);
    if (insErr) throw new Error(insErr.message);
  }
}

/** Add one tag to many entities (bulk). */
export async function addEtiquetaABulk(entidad: Entidad, entityIds: string[], etiquetaId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { table, col } = PIVOT[entidad];
  const rows = entityIds.map((id) => ({ [col]: id, etiqueta_id: etiquetaId, tenant_id: user.tenantId }));
  const { error } = await supabase.from(table).upsert(rows, { onConflict: `${col},etiqueta_id` });
  if (error) throw new Error(error.message);
}
