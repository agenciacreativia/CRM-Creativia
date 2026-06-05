import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type EmpresaListItem = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  origen: string | null;
  asignado_id: string | null;
  asignado_nombre: string | null;
  creado_en: string;
  contactos_count: number;
  oportunidades_count: number;
  campos_custom: Record<string, unknown>;
};

export type EmpresaDetail = EmpresaListItem & {
  sitio_web: string | null;
  direccion: string | null;
  descripcion: string | null;
};

type RawEmpresaRow = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  origen: string | null;
  asignado_id: string | null;
  asignado: { nombre: string } | { nombre: string }[] | null;
  creado_en: string;
  campos_custom: Record<string, unknown> | null;
  contacto?: { count: number }[];
  oportunidad?: { count: number }[];
};

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function listEmpresas(opts: { q?: string; estado?: string; limit?: number } = {}): Promise<EmpresaListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("empresa")
    .select("id, nombre, email, telefono, ciudad, pais, estado_empresa, origen, asignado_id, asignado:usuario!empresa_asignado_id_fkey(nombre), creado_en, campos_custom, contacto(count), oportunidad(count)")
    .order("nombre", { ascending: true })
    .limit(opts.limit ?? 200);

  if (opts.q) {
    const s = `%${opts.q}%`;
    query = query.or(`nombre.ilike.${s},email.ilike.${s},ciudad.ilike.${s}`);
  }
  if (opts.estado && opts.estado !== "todos") {
    query = query.eq("estado_empresa", opts.estado);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as RawEmpresaRow[]).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    ciudad: row.ciudad,
    pais: row.pais,
    estado_empresa: row.estado_empresa,
    origen: row.origen,
    asignado_id: row.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(row.asignado)?.nombre ?? null,
    creado_en: row.creado_en,
    contactos_count: row.contacto?.[0]?.count ?? 0,
    oportunidades_count: row.oportunidad?.[0]?.count ?? 0,
    campos_custom: row.campos_custom ?? {},
  }));
}

export async function getEmpresa(id: string): Promise<EmpresaDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("empresa")
    .select("*, asignado:usuario!empresa_asignado_id_fkey(nombre), contacto(count), oportunidad(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    email: data.email,
    telefono: data.telefono,
    ciudad: data.ciudad,
    pais: data.pais,
    estado_empresa: data.estado_empresa,
    origen: data.origen,
    asignado_id: data.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(data.asignado)?.nombre ?? null,
    creado_en: data.creado_en,
    sitio_web: data.sitio_web,
    direccion: data.direccion,
    descripcion: data.descripcion,
    campos_custom: data.campos_custom ?? {},
    contactos_count: data.contacto?.[0]?.count ?? 0,
    oportunidades_count: data.oportunidad?.[0]?.count ?? 0,
  };
}
