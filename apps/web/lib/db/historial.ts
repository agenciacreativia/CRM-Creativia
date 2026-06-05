import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type CambioEntry = {
  id: string;
  descripcion: string;
  autor: string | null;
  fecha: string;
};

/**
 * Generic change history for empresa/contacto/oportunidad. Defensive: returns
 * [] if the table doesn't exist yet (before migration 0009).
 */
export async function listHistorialCambios(
  entidad: "empresa" | "contacto" | "oportunidad",
  entityId: string,
): Promise<CambioEntry[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("historial_cambio")
    .select("id, descripcion, cambiado_en, usuario:cambiado_por(nombre)")
    .eq("entidad", entidad)
    .eq("entity_id", entityId)
    .order("cambiado_en", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []).map(
    (row: { id: string; descripcion: string; cambiado_en: string; usuario: { nombre: string } | { nombre: string }[] | null }) => {
      const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
      return { id: row.id, descripcion: row.descripcion, autor: u?.nombre ?? null, fecha: row.cambiado_en };
    },
  );
}

export type AuditoriaItem = {
  id: string;
  entidad: "empresa" | "contacto" | "oportunidad";
  entity_id: string;
  descripcion: string;
  autor: string | null;
  fecha: string;
};

/** Tenant-wide change log (admin audit). Defensive: [] pre-0009. */
export async function listAuditoria(
  opts: { entidad?: string; q?: string; limit?: number; asesor?: string; desde?: string; hasta?: string } = {},
): Promise<AuditoriaItem[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("historial_cambio")
    .select("id, entidad, entity_id, descripcion, cambiado_en, cambiado_por, usuario:cambiado_por(nombre)")
    .order("cambiado_en", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.entidad && opts.entidad !== "todos") query = query.eq("entidad", opts.entidad);
  if (opts.q) query = query.ilike("descripcion", `%${opts.q}%`);
  if (opts.asesor && opts.asesor !== "todos") query = query.eq("cambiado_por", opts.asesor);
  if (opts.desde) query = query.gte("cambiado_en", opts.desde);
  if (opts.hasta) query = query.lte("cambiado_en", `${opts.hasta}T23:59:59.999Z`);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map(
    (row: { id: string; entidad: AuditoriaItem["entidad"]; entity_id: string; descripcion: string; cambiado_en: string; cambiado_por?: string | null; usuario: { nombre: string } | { nombre: string }[] | null }) => {
      const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
      return { id: row.id, entidad: row.entidad, entity_id: row.entity_id, descripcion: row.descripcion, autor: u?.nombre ?? null, fecha: row.cambiado_en };
    },
  );
}

export type HistorialEntry = {
  id: string;
  oportunidad_id: string;
  etapa_anterior_nombre: string | null;
  etapa_nueva_nombre: string;
  cambiado_por_nombre: string | null;
  cambiado_en: string;
};

export async function listHistorialOportunidad(oportunidad_id: string): Promise<HistorialEntry[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("historial_etapa")
    .select("id, oportunidad_id, cambiado_en, anterior:etapa_anterior(nombre), nueva:etapa_nueva(nombre), usuario:cambiado_por(nombre)")
    .eq("oportunidad_id", oportunidad_id)
    .order("cambiado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; oportunidad_id: string; cambiado_en: string; anterior: { nombre: string } | { nombre: string }[] | null; nueva: { nombre: string } | { nombre: string }[] | null; usuario: { nombre: string } | { nombre: string }[] | null }) => {
    const oneOf = <T extends { nombre: string }>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? v[0] ?? null : v;
    return {
      id: row.id,
      oportunidad_id: row.oportunidad_id,
      etapa_anterior_nombre: oneOf(row.anterior)?.nombre ?? null,
      etapa_nueva_nombre: oneOf(row.nueva)?.nombre ?? "—",
      cambiado_por_nombre: oneOf(row.usuario)?.nombre ?? null,
      cambiado_en: row.cambiado_en,
    };
  });
}
