import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/db/filtros";

export type ContactoListItem = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  descripcion: string | null;
  origen: string | null;
  empresa_id: string;
  empresa_nombre: string;
  asignado_id: string | null;
  asignado_nombre: string | null;
  oportunidades_count: number;
  campos_custom: Record<string, unknown>;
  // Datos de relacionados para filtros cross-módulo (Empresa/Oportunidad) sobre
  // la lista de contactos. No se muestran en la tabla; solo el motor.
  _rel?: {
    empresa: Record<string, unknown> | null;
    oportunidades: Record<string, unknown>[];
  };
};

export type ContactoDetail = ContactoListItem & {
  fecha_nacimiento: string | null;
  creado_en: string;
};

type RawContactoRow = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  descripcion: string | null;
  origen: string | null;
  empresa_id: string;
  empresa: Record<string, unknown> | Record<string, unknown>[] | null;
  asignado_id: string | null;
  asignado: { nombre: string } | { nombre: string }[] | null;
  campos_custom: Record<string, unknown> | null;
  oportunidad?: { count: number }[];
  rel_oportunidades?: Record<string, unknown>[];
};

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function listContactos(opts: { q?: string; empresa_id?: string; asignado_id?: string; limit?: number; offset?: number; ids?: string[] } = {}): Promise<ContactoListItem[]> {
  const supabase = await createServerSupabase();

  // Paginacion: limit acotado y offset opcional para evitar cargas grandes
  const limit = Math.min(Math.max(opts.ids?.length ?? opts.limit ?? 200, 1), 5000);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabase
    .from("contacto")
    // Embed explícito de empresa via FK principal. Necesario desde la mig 0042
    // (contacto_empresa_secundaria) — PostgREST ve dos relaciones (la principal
    // y la M-N) y rechaza `empresa(...)` ambiguo con PGRST201.
    .select(
      "id, nombre, cargo, email, telefono, telefono_whatsapp, descripcion, origen, empresa_id, " +
        // Embed de empresa con sus campos filtrables (sirve para empresa_nombre y para _rel.empresa).
        "empresa:empresa!contacto_empresa_id_fkey(nombre, email, telefono, ciudad, pais, estado_empresa, origen, sitio_web, direccion, descripcion, asignado_id, creado_en, campos_custom), " +
        "asignado_id, asignado:usuario!contacto_asignado_id_fkey(nombre), campos_custom, oportunidad(count), " +
        // Oportunidades relacionadas para filtros cross-módulo ("tiene una oportunidad que…").
        "rel_oportunidades:oportunidad(nombre, valor, estado, moneda, probabilidad_cierre, fecha_esperada_cierre, asignado_id, pipeline_id, etapa_id, descripcion, creado_en, campos_custom)",
    )
    .order("nombre", { ascending: true })
    .range(offset, offset + limit - 1);

  if (opts.ids?.length) query = query.in("id", opts.ids);
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

  return ((data ?? []) as unknown as RawContactoRow[]).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    cargo: row.cargo,
    email: row.email,
    telefono: row.telefono,
    telefono_whatsapp: row.telefono_whatsapp,
    descripcion: row.descripcion,
    origen: row.origen,
    empresa_id: row.empresa_id,
    empresa_nombre: (oneOf<{ nombre: string }>(row.empresa as { nombre: string } | { nombre: string }[] | null)?.nombre) ?? "(sin empresa)",
    asignado_id: row.asignado_id,
    asignado_nombre: oneOf<{ nombre: string }>(row.asignado)?.nombre ?? null,
    oportunidades_count: row.oportunidad?.[0]?.count ?? 0,
    campos_custom: row.campos_custom ?? {},
    _rel: {
      empresa: oneOf<Record<string, unknown>>(row.empresa),
      oportunidades: row.rel_oportunidades ?? [],
    },
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
