import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/db/filtros";

export type ContactoListItem = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  origen: string | null;
  empresa_id: string;
  empresa_nombre: string;
  asignado_id: string | null;
  asignado_nombre: string | null;
  oportunidades_count: number;
  campos_custom: Record<string, unknown>;
};

export type ContactoDetail = ContactoListItem & {
  telefono_whatsapp: string | null;
  descripcion: string | null;
  fecha_nacimiento: string | null;
  creado_en: string;
};

type RawContactoRow = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  origen: string | null;
  empresa_id: string;
  empresa: { nombre: string } | { nombre: string }[] | null;
  asignado_id: string | null;
  asignado: { nombre: string } | { nombre: string }[] | null;
  campos_custom: Record<string, unknown> | null;
  oportunidad?: { count: number }[];
};

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function listContactos(opts: { q?: string; empresa_id?: string; asignado_id?: string; limit?: number; offset?: number } = {}): Promise<ContactoListItem[]> {
  const supabase = await createServerSupabase();

  // Paginacion: limit acotado y offset opcional para evitar cargas grandes
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 2000);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase
    .from("contacto")
    // Embed explícito de empresa via FK principal. Necesario desde la mig 0042
    // (contacto_empresa_secundaria) — PostgREST ve dos relaciones (la principal
    // y la M-N) y rechaza `empresa(...)` ambiguo con PGRST201.
    .select("id, nombre, cargo, email, telefono, origen, empresa_id, empresa:empresa!contacto_empresa_id_fkey(nombre), asignado_id, asignado:usuario!contacto_asignado_id_fkey(nombre), campos_custom, oportunidad(count)")
    .order("nombre", { ascending: true })
    .range(offset, offset + limit - 1);

  if (opts.q) {
    const s = escapeLike(opts.q);
    query = query.or(`nombre.ilike.${s},email.ilike.${s},cargo.ilike.${s}`);
  }
  if (opts.empresa_id) {
    query = query.eq("empresa_id", opts.empresa_id);
  }
  if (opts.asignado_id) {
    query = query.eq("asignado_id", opts.asignado_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as RawContactoRow[]).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cargo: row.cargo,
    email: row.email,
    telefono: row.telefono,
    origen: row.origen,
    empresa_id: row.empresa_id,
    empresa_nombre: oneOf<{ nombre: string }>(row.empresa)?.nombre ?? "(sin empresa)",
    asignado_id: row.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(row.asignado)?.nombre ?? null,
    oportunidades_count: row.oportunidad?.[0]?.count ?? 0,
    campos_custom: row.campos_custom ?? {},
  }));
}

export async function getContacto(id: string): Promise<ContactoDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contacto")
    .select("*, empresa:empresa!contacto_empresa_id_fkey(nombre), asignado:usuario!contacto_asignado_id_fkey(nombre), oportunidad(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    cargo: data.cargo,
    email: data.email,
    telefono: data.telefono,
    empresa_id: data.empresa_id,
    empresa_nombre: oneOf<{ nombre: string }>(data.empresa)?.nombre ?? "(sin empresa)",
    asignado_id: data.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(data.asignado)?.nombre ?? null,
    telefono_whatsapp: data.telefono_whatsapp,
    origen: data.origen,
    descripcion: data.descripcion,
    fecha_nacimiento: data.fecha_nacimiento ?? null,
    campos_custom: data.campos_custom ?? {},
    creado_en: data.creado_en,
    oportunidades_count: data.oportunidad?.[0]?.count ?? 0,
  };
}
