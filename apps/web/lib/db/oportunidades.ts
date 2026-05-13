import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type OportunidadListItem = {
  id: string;
  nombre: string;
  valor: number | null;
  moneda: string;
  estado: "activo" | "ganado" | "perdido" | "eliminado";
  empresa_id: string;
  empresa_nombre: string;
  contacto_nombre: string;
  pipeline_nombre: string;
  etapa_nombre: string;
  asignado_nombre: string | null;
  fecha_esperada_cierre: string | null;
  creado_en: string;
};

export async function listOportunidades(opts: { q?: string; estado?: string; pipeline_id?: string } = {}): Promise<OportunidadListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("oportunidad")
    .select(
      "id, nombre, valor, moneda, estado, empresa_id, fecha_esperada_cierre, creado_en, empresa(nombre), contacto(nombre), pipeline(nombre), etapa_pipeline(nombre), usuario(nombre)",
    )
    .order("creado_en", { ascending: false })
    .limit(200);

  if (opts.q) {
    query = query.ilike("nombre", `%${opts.q}%`);
  }
  if (opts.estado && opts.estado !== "todos") {
    query = query.eq("estado", opts.estado);
  }
  if (opts.pipeline_id) {
    query = query.eq("pipeline_id", opts.pipeline_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: { id: string; nombre: string; valor: number | null; moneda: string; estado: "activo" | "ganado" | "perdido" | "eliminado"; empresa_id: string; fecha_esperada_cierre: string | null; creado_en: string; empresa: { nombre: string } | { nombre: string }[] | null; contacto: { nombre: string } | { nombre: string }[] | null; pipeline: { nombre: string } | { nombre: string }[] | null; etapa_pipeline: { nombre: string } | { nombre: string }[] | null; usuario: { nombre: string } | { nombre: string }[] | null }) => {
    const oneOf = <T extends { nombre: string }>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? v[0] ?? null : v;
    return {
      id: row.id,
      nombre: row.nombre,
      valor: row.valor,
      moneda: row.moneda,
      estado: row.estado,
      empresa_id: row.empresa_id,
      empresa_nombre: oneOf(row.empresa)?.nombre ?? "—",
      contacto_nombre: oneOf(row.contacto)?.nombre ?? "—",
      pipeline_nombre: oneOf(row.pipeline)?.nombre ?? "—",
      etapa_nombre: oneOf(row.etapa_pipeline)?.nombre ?? "—",
      asignado_nombre: oneOf(row.usuario)?.nombre ?? null,
      fecha_esperada_cierre: row.fecha_esperada_cierre,
      creado_en: row.creado_en,
    };
  });
}
