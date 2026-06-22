import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/db/filtros";

export type EmpresaListItem = {
  id: string;
  nombre: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  origen: string | null;
  sitio_web: string | null;
  direccion: string | null;
  descripcion: string | null;
  asignado_id: string | null;
  asignado_nombre: string | null;
  creado_en: string;
  contactos_count: number;
  oportunidades_count: number;
  campos_custom: Record<string, unknown>;
  // Datos de relacionados para evaluar filtros cross-módulo (Contacto/Oportunidad)
  // sobre la lista de empresas. No se muestran en la tabla; solo el motor.
  _rel?: {
    contactos: Record<string, unknown>[];
    oportunidades: Record<string, unknown>[];
  };
};

export type EmpresaDetail = EmpresaListItem;

type RawEmpresaRow = {
  id: string;
  nombre: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  origen: string | null;
  sitio_web: string | null;
  direccion: string | null;
  descripcion: string | null;
  asignado_id: string | null;
  asignado: { nombre: string } | { nombre: string }[] | null;
  creado_en: string;
  campos_custom: Record<string, unknown> | null;
  contacto?: { count: number }[];
  oportunidad?: { count: number }[];
  rel_contactos?: Record<string, unknown>[];
  rel_oportunidades?: Record<string, unknown>[];
};
// (sitio_web/direccion/descripcion ahora están en el ListItem para poder
//  filtrarlos; las queries de abajo los incluyen.)

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function listEmpresas(opts: { q?: string; estado?: string; limit?: number; ids?: string[] } = {}): Promise<EmpresaListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("empresa")
    // Embed explícito de contacto via FK principal (mig 0042 contacto_empresa_secundaria
    // introdujo una segunda relación empresa↔contacto, PGRST201 con embed simple).
    .select(
      "id, nombre, nit, email, telefono, ciudad, pais, estado_empresa, origen, sitio_web, direccion, descripcion, asignado_id, asignado:usuario!empresa_asignado_id_fkey(nombre), creado_en, campos_custom, " +
        "contacto:contacto!contacto_empresa_id_fkey(count), oportunidad(count), " +
        // Relacionados para filtros cross-módulo (semántica "tiene al menos uno que cumple").
        "rel_contactos:contacto!contacto_empresa_id_fkey(nombre, cargo, email, telefono, telefono_whatsapp, origen, descripcion, asignado_id, campos_custom), " +
        "rel_oportunidades:oportunidad(nombre, valor, estado, moneda, probabilidad_cierre, fecha_esperada_cierre, asignado_id, pipeline_id, etapa_id, descripcion, creado_en, campos_custom)",
    )
    .order("nombre", { ascending: true })
    .limit(opts.ids?.length ? opts.ids.length : opts.limit ?? 200);

  if (opts.ids?.length) query = query.in("id", opts.ids);
  if (opts.q) {
    const s = escapeLike(opts.q);
    query = query.or(`nombre.ilike.${s},email.ilike.${s},ciudad.ilike.${s}`);
  }
  if (opts.estado && opts.estado !== "todos") {
    query = query.eq("estado_empresa", opts.estado);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawEmpresaRow[]).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    nit: row.nit ?? null,
    email: row.email,
    telefono: row.telefono,
    ciudad: row.ciudad,
    pais: row.pais,
    estado_empresa: row.estado_empresa,
    origen: row.origen,
    sitio_web: row.sitio_web,
    direccion: row.direccion,
    descripcion: row.descripcion,
    asignado_id: row.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(row.asignado)?.nombre ?? null,
    creado_en: row.creado_en,
    contactos_count: row.contacto?.[0]?.count ?? 0,
    oportunidades_count: row.oportunidad?.[0]?.count ?? 0,
    campos_custom: row.campos_custom ?? {},
    _rel: {
      contactos: row.rel_contactos ?? [],
      oportunidades: row.rel_oportunidades ?? [],
    },
  }));
}

export async function getEmpresa(id: string): Promise<EmpresaDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("empresa")
    // Embed explícito (mig 0042 introdujo ambigüedad).
    .select("*, asignado:usuario!empresa_asignado_id_fkey(nombre), contacto:contacto!contacto_empresa_id_fkey(count), oportunidad(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    nit: data.nit ?? null,
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
