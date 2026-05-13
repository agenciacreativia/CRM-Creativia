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
  oportunidades_count: number;
};

export type ContactoDetail = ContactoListItem & {
  telefono_whatsapp: string | null;
  origen: string | null;
  descripcion: string | null;
  campos_custom: Record<string, unknown>;
  creado_en: string;
};

export async function listContactos(opts: { q?: string; empresa_id?: string } = {}): Promise<ContactoListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("contacto")
    .select("id, nombre, cargo, email, telefono, empresa_id, empresa(nombre), oportunidad(count)")
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

  return (data ?? []).map((row: { id: string; nombre: string; cargo: string | null; email: string; telefono: string | null; empresa_id: string; empresa: { nombre: string } | { nombre: string }[] | null; oportunidad?: { count: number }[] }) => {
    const empresa = Array.isArray(row.empresa) ? row.empresa[0] : row.empresa;
    return {
      id: row.id,
      nombre: row.nombre,
      cargo: row.cargo,
      email: row.email,
      telefono: row.telefono,
      empresa_id: row.empresa_id,
      empresa_nombre: empresa?.nombre ?? "(sin empresa)",
      oportunidades_count: row.oportunidad?.[0]?.count ?? 0,
    };
  });
}

export async function getContacto(id: string): Promise<ContactoDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contacto")
    .select("*, empresa(nombre), oportunidad(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const empresa = Array.isArray(data.empresa) ? data.empresa[0] : data.empresa;
  return {
    id: data.id,
    nombre: data.nombre,
    cargo: data.cargo,
    email: data.email,
    telefono: data.telefono,
    empresa_id: data.empresa_id,
    empresa_nombre: empresa?.nombre ?? "(sin empresa)",
    telefono_whatsapp: data.telefono_whatsapp,
    origen: data.origen,
    descripcion: data.descripcion,
    campos_custom: data.campos_custom ?? {},
    creado_en: data.creado_en,
    oportunidades_count: data.oportunidad?.[0]?.count ?? 0,
  };
}
