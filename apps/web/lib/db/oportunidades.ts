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
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  creado_en: string;
  campos_custom: Record<string, unknown>;
};

export type OportunidadDetail = {
  id: string;
  nombre: string;
  valor: number | null;
  moneda: string;
  estado: "activo" | "ganado" | "perdido" | "eliminado";
  empresa_id: string;
  empresa_nombre: string;
  contacto_id: string;
  contacto_nombre: string;
  pipeline_id: string;
  pipeline_nombre: string;
  etapa_id: string;
  etapa_nombre: string;
  etapa_dias_maximo_alerta: number | null;
  asignado_id: string | null;
  asignado_nombre: string | null;
  motivo_perdida_id: string | null;
  motivo_perdida_nombre: string | null;
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  fecha_entrado_etapa: string;
  observaciones_perdida: string | null;
  descripcion: string | null;
  estrategia: string | null;
  campos_custom: Record<string, unknown>;
  creado_por: string | null;
  creado_en: string;
  eliminada_en: string | null;
};

export async function getOportunidad(id: string): Promise<OportunidadDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad")
    .select(
      "*, empresa(nombre), contacto(nombre), pipeline(nombre), etapa_pipeline(nombre, dias_maximo_alerta), usuario!oportunidad_asignado_id_fkey(nombre), motivo_perdida(nombre)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const oneOf = <T>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  const e = oneOf<{ nombre: string }>(data.empresa);
  const c = oneOf<{ nombre: string }>(data.contacto);
  const p = oneOf<{ nombre: string }>(data.pipeline);
  const et = oneOf<{ nombre: string; dias_maximo_alerta: number | null }>(data.etapa_pipeline);
  const u = oneOf<{ nombre: string }>(data.usuario);
  const m = oneOf<{ nombre: string }>(data.motivo_perdida);

  return {
    id: data.id,
    nombre: data.nombre,
    valor: data.valor,
    moneda: data.moneda,
    estado: data.estado,
    empresa_id: data.empresa_id,
    empresa_nombre: e?.nombre ?? "—",
    contacto_id: data.contacto_id,
    contacto_nombre: c?.nombre ?? "—",
    pipeline_id: data.pipeline_id,
    pipeline_nombre: p?.nombre ?? "—",
    etapa_id: data.etapa_id,
    etapa_nombre: et?.nombre ?? "—",
    etapa_dias_maximo_alerta: et?.dias_maximo_alerta ?? null,
    asignado_id: data.asignado_id,
    asignado_nombre: u?.nombre ?? null,
    motivo_perdida_id: data.motivo_perdida_id,
    motivo_perdida_nombre: m?.nombre ?? null,
    probabilidad_cierre: data.probabilidad_cierre,
    fecha_esperada_cierre: data.fecha_esperada_cierre,
    fecha_entrado_etapa: data.fecha_entrado_etapa,
    observaciones_perdida: data.observaciones_perdida,
    descripcion: data.descripcion,
    estrategia: data.estrategia ?? null,
    campos_custom: data.campos_custom ?? {},
    creado_por: data.creado_por ?? null,
    creado_en: data.creado_en,
    eliminada_en: data.eliminada_en ?? null,
  };
}

export type KanbanColumn = {
  pipeline_id: string;
  pipeline_nombre: string;
  etapas: {
    id: string;
    nombre: string;
    orden: number;
    dias_maximo_alerta: number | null;
    oportunidades: KanbanCard[];
  }[];
};

export type KanbanCard = {
  id: string;
  nombre: string;
  valor: number | null;
  moneda: string;
  empresa_nombre: string;
  asignado_nombre: string | null;
  dias_en_etapa: number;
  color: "green" | "yellow" | "red" | "gray";
};

export type EtapaItem = {
  id: string;
  nombre: string;
  orden: number;
  dias_maximo_alerta: number | null;
};

/** Ordered stages of a pipeline — used by the deal detail wizard. */
export async function listEtapasDePipeline(pipelineId: string): Promise<EtapaItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("etapa_pipeline")
    .select("id, nombre, orden, dias_maximo_alerta")
    .eq("pipeline_id", pipelineId)
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EtapaItem[];
}

export async function getKanbanBoard(pipeline_id?: string): Promise<KanbanColumn[]> {
  const supabase = await createServerSupabase();
  const { data: pipelines } = await supabase
    .from("pipeline")
    .select("id, nombre, es_default")
    .order("es_default", { ascending: false })
    .order("nombre", { ascending: true });

  const selectedPipelineId = pipeline_id ?? (pipelines ?? [])[0]?.id;
  if (!selectedPipelineId) return [];

  const { data: etapas } = await supabase
    .from("etapa_pipeline")
    .select("id, nombre, orden, dias_maximo_alerta, pipeline_id")
    .eq("pipeline_id", selectedPipelineId)
    .order("orden", { ascending: true });

  const { data: opportunities } = await supabase
    .from("oportunidad")
    .select("id, nombre, valor, moneda, etapa_id, fecha_entrado_etapa, empresa(nombre), usuario!oportunidad_asignado_id_fkey(nombre)")
    .eq("pipeline_id", selectedPipelineId)
    .eq("estado", "activo");

  const cardsByEtapa = new Map<string, KanbanCard[]>();
  const now = Date.now();
  type RawOpp = {
    id: string;
    nombre: string;
    valor: number | null;
    moneda: string;
    etapa_id: string;
    fecha_entrado_etapa: string;
    empresa: { nombre: string } | { nombre: string }[] | null;
    usuario: { nombre: string } | { nombre: string }[] | null;
  };
  for (const o of (opportunities ?? []) as RawOpp[]) {
    const oneOf = <T>(v: T | T[] | null | undefined): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
    const dias = Math.floor((now - new Date(o.fecha_entrado_etapa).getTime()) / (1000 * 60 * 60 * 24));
    const etapaInfo = (etapas ?? []).find((e) => e.id === o.etapa_id);
    const limit = etapaInfo?.dias_maximo_alerta ?? null;
    let color: KanbanCard["color"] = "green";
    if (limit !== null) {
      if (dias >= limit) color = "red";
      else if (dias >= Math.floor(limit * 0.7)) color = "yellow";
    }
    const card: KanbanCard = {
      id: o.id,
      nombre: o.nombre,
      valor: o.valor,
      moneda: o.moneda,
      empresa_nombre: oneOf<{ nombre: string }>(o.empresa)?.nombre ?? "—",
      asignado_nombre: oneOf<{ nombre: string }>(o.usuario)?.nombre ?? null,
      dias_en_etapa: dias,
      color,
    };
    if (!cardsByEtapa.has(o.etapa_id)) cardsByEtapa.set(o.etapa_id, []);
    cardsByEtapa.get(o.etapa_id)!.push(card);
  }

  const selectedPipeline = (pipelines ?? []).find((p) => p.id === selectedPipelineId);
  if (!selectedPipeline) return [];

  return [
    {
      pipeline_id: selectedPipelineId,
      pipeline_nombre: selectedPipeline.nombre,
      etapas: (etapas ?? []).map((e) => ({
        id: e.id,
        nombre: e.nombre,
        orden: e.orden,
        dias_maximo_alerta: e.dias_maximo_alerta,
        oportunidades: cardsByEtapa.get(e.id) ?? [],
      })),
    },
  ];
}

export async function listPipelinesForPicker() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("pipeline")
    .select("id, nombre, es_default")
    .order("es_default", { ascending: false })
    .order("nombre");
  return data ?? [];
}

export async function listOportunidades(opts: {
  q?: string;
  estado?: string;
  pipeline_id?: string;
  asignado_id?: string;
  cierre_desde?: string;
  cierre_hasta?: string;
  valor_min?: number;
  valor_max?: number;
  limit?: number;
} = {}): Promise<OportunidadListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("oportunidad")
    .select(
      "id, nombre, valor, moneda, estado, empresa_id, asignado_id, probabilidad_cierre, fecha_esperada_cierre, creado_en, campos_custom, empresa(nombre), contacto(nombre), pipeline(nombre), etapa_pipeline(nombre), usuario!oportunidad_asignado_id_fkey(nombre)",
    )
    .order("creado_en", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.q) {
    query = query.ilike("nombre", `%${opts.q}%`);
  }
  if (opts.estado && opts.estado !== "todos") {
    query = query.eq("estado", opts.estado);
  } else {
    // Default: ocultar oportunidades en estado "eliminado" (soft-delete 30 días).
    // El admin que quiere ver las eliminadas usa estado=eliminado o estado=todos.
    query = query.neq("estado", "eliminado");
  }
  if (opts.pipeline_id) {
    query = query.eq("pipeline_id", opts.pipeline_id);
  }
  if (opts.asignado_id) {
    if (opts.asignado_id === "_unassigned") {
      query = query.is("asignado_id", null);
    } else {
      query = query.eq("asignado_id", opts.asignado_id);
    }
  }
  if (opts.cierre_desde) {
    query = query.gte("fecha_esperada_cierre", opts.cierre_desde);
  }
  if (opts.cierre_hasta) {
    query = query.lte("fecha_esperada_cierre", opts.cierre_hasta);
  }
  if (opts.valor_min != null && Number.isFinite(opts.valor_min)) {
    query = query.gte("valor", opts.valor_min);
  }
  if (opts.valor_max != null && Number.isFinite(opts.valor_max)) {
    query = query.lte("valor", opts.valor_max);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: { id: string; nombre: string; valor: number | null; moneda: string; estado: "activo" | "ganado" | "perdido" | "eliminado"; empresa_id: string; asignado_id: string | null; probabilidad_cierre: number | null; fecha_esperada_cierre: string | null; creado_en: string; campos_custom: Record<string, unknown> | null; empresa: { nombre: string } | { nombre: string }[] | null; contacto: { nombre: string } | { nombre: string }[] | null; pipeline: { nombre: string } | { nombre: string }[] | null; etapa_pipeline: { nombre: string } | { nombre: string }[] | null; usuario: { nombre: string } | { nombre: string }[] | null }) => {
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
      probabilidad_cierre: row.probabilidad_cierre,
      fecha_esperada_cierre: row.fecha_esperada_cierre,
      creado_en: row.creado_en,
      campos_custom: row.campos_custom ?? {},
    };
  });
}
