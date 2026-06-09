import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type OppRel = {
  id: string;
  nombre: string;
  estado: string;
  valor: number | null;
  moneda: string;
  etapa_nombre: string | null;
  asignado_nombre: string | null;
  creado_en: string;
};

const OPP_COLS =
  "id, nombre, estado, valor, moneda, creado_en, etapa_pipeline(nombre), usuario!oportunidad_asignado_id_fkey(nombre)";

function shapeOpp(r: Record<string, unknown>): OppRel {
  const et = (Array.isArray(r.etapa_pipeline) ? r.etapa_pipeline[0] : r.etapa_pipeline) as { nombre: string } | null;
  const u = (Array.isArray(r.usuario) ? r.usuario[0] : r.usuario) as { nombre: string } | null;
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    estado: (r.estado as string) ?? "activo",
    valor: (r.valor as number | null) ?? null,
    moneda: (r.moneda as string) ?? "USD",
    etapa_nombre: et?.nombre ?? null,
    asignado_nombre: u?.nombre ?? null,
    creado_en: r.creado_en as string,
  };
}

export async function listOportunidadesDeContacto(contactoId: string): Promise<OppRel[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad")
    .select(OPP_COLS)
    .eq("contacto_id", contactoId)
    .neq("estado", "eliminado")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => shapeOpp(r as Record<string, unknown>));
}

export async function listOportunidadesDeEmpresa(empresaId: string): Promise<OppRel[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad")
    .select(OPP_COLS)
    .eq("empresa_id", empresaId)
    .neq("estado", "eliminado")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => shapeOpp(r as Record<string, unknown>));
}

export type ContactoRel = {
  id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  asignado_nombre: string | null;
};

export type EmpresaRel = { id: string; nombre: string; estado: string | null };

/**
 * Empresas asociadas a un contacto: la empresa principal + cualquier otra
 * empresa que aparezca en sus oportunidades. Es la fuente más cercana a un
 * many-to-many sin tocar el esquema todavía.
 */
export async function listEmpresasDeContacto(contactoId: string): Promise<EmpresaRel[]> {
  const supabase = await createServerSupabase();
  const { data: c } = await supabase
    .from("contacto")
    .select("empresa_id, empresa(id, nombre, estado_empresa)")
    .eq("id", contactoId)
    .maybeSingle();
  const { data: ops } = await supabase
    .from("oportunidad")
    .select("empresa(id, nombre, estado_empresa)")
    .eq("contacto_id", contactoId)
    .neq("estado", "eliminado");
  const seen = new Map<string, EmpresaRel>();
  const add = (e: { id: string; nombre: string; estado_empresa: string | null } | null | undefined) => {
    if (!e?.id) return;
    if (!seen.has(e.id)) seen.set(e.id, { id: e.id, nombre: e.nombre, estado: e.estado_empresa ?? null });
  };
  const pri = (Array.isArray(c?.empresa) ? c?.empresa?.[0] : c?.empresa) as { id: string; nombre: string; estado_empresa: string | null } | null | undefined;
  add(pri);
  for (const r of (ops ?? []) as { empresa: { id: string; nombre: string; estado_empresa: string | null } | { id: string; nombre: string; estado_empresa: string | null }[] | null }[]) {
    const e = (Array.isArray(r.empresa) ? r.empresa[0] : r.empresa) ?? null;
    add(e);
  }
  return [...seen.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function listContactosDeEmpresa(empresaId: string): Promise<ContactoRel[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("contacto")
    .select("id, nombre, cargo, email, telefono, asignado:usuario!contacto_asignado_id_fkey(nombre)")
    .eq("empresa_id", empresaId)
    .order("nombre");
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const u = (Array.isArray(r.asignado) ? r.asignado[0] : r.asignado) as { nombre: string } | null;
    return {
      id: r.id as string,
      nombre: r.nombre as string,
      cargo: (r.cargo as string | null) ?? null,
      email: (r.email as string) ?? "",
      telefono: (r.telefono as string | null) ?? null,
      asignado_nombre: u?.nombre ?? null,
    };
  });
}
