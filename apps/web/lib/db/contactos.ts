import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type ContactoListItem = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  empresa_id: string;
  empresa_nombre: string;
  asignado_id: string | null;
  asignado_nombre: string | null;
  oportunidades_count: number;
};

export type ContactoDetail = ContactoListItem & {
  telefono_whatsapp: string | null;
  origen: string | null;
  descripcion: string | null;
  campos_custom: Record<string, unknown>;
  creado_en: string;
};

type RawContactoRow = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  empresa_id: string;
  empresa: { nombre: string } | { nombre: string }[] | null;
  asignado_id: string | null;
  asignado: { nombre: string } | { nombre: string }[] | null;
  oportunidad?: { count: number }[];
};

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function listContactos(opts: { q?: string; empresa_id?: string } = {}): Promise<ContactoListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("contacto")
    .select("id, nombre, cargo, email, telefono, empresa_id, empresa(nombre), asignado_id, asignado:usuario!contacto_asignado_id_fkey(nombre), oportunidad(count)")
    .order("nombre", { ascending: true })
    .limit(200);

  if (opts.q) {
    const s = `%${opts.q}%`;
    query = query.or(`nombre.ilike.${s},email.ilike.${s},cargo.ilike.${s}`);
  }
  if (opts.empresa_id) {
    query = query.eq("empresa_id", opts.empresa_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as RawContactoRow[]).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cargo: row.cargo,
    email: row.email,
    telefono: row.telefono,
    empresa_id: row.empresa_id,
    empresa_nombre: oneOf<{ nombre: string }>(row.empresa)?.nombre ?? "(sin empresa)",
    asignado_id: row.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(row.asignado)?.nombre ?? null,
    oportunidades_count: row.oportunidad?.[0]?.count ?? 0,
  }));
}

export async function getContacto(id: string): Promise<ContactoDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contacto")
    .select("*, empresa(nombre), asignado:usuario!contacto_asignado_id_fkey(nombre), oportunidad(count)")
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
    campos_custom: data.campos_custom ?? {},
    creado_en: data.creado_en,
    oportunidades_count: data.oportunidad?.[0]?.count ?? 0,
  };
}
