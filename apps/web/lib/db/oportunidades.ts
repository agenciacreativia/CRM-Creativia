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
  pipeline_id: string;
  pipeline_nombre: string;
  etapa_id: string;
  etapa_nombre: string;
  etapa_anterior_id: string | null;
  etapa_anterior_nombre: string | null;
  fecha_entrado_etapa: string | null;
  descripcion: string | null;
  asignado_id: string | null;
  asignado_nombre: string | null;
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  creado_en: string;
  campos_custom: Record<string, unknown>;
  // Datos de las entidades relacionadas, para evaluar filtros cross-módulo
  // (Empresa/Contacto/Producto) sobre la lista de oportunidades. No se
  // muestran en la tabla; solo los usa el motor de filtros.
  _rel: {
    empresa: Record<string, unknown> | null;
    contacto: Record<string, unknown> | null;
    productos: Record<string, unknown>[];
  };
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

// Tipo helper para relaciones embebidas de Supabase: pueden venir como objeto
// o como array (segun cardinalidad inferida). Reutilizado en este modulo.
type EmbeddedRef<T> = T | T[] | null;

// Forma cruda de una oportunidad para el tablero Kanban.
type RawKanbanOpp = {
  id: string;
  nombre: string;
  valor: number | null;
  moneda: string;
  etapa_id: string;
  fecha_entrado_etapa: string;
  empresa: EmbeddedRef<{ nombre: string }>;
  usuario: EmbeddedRef<{ nombre: string }>;
};

// Forma cruda de una oportunidad para el listado.
type RawOpportunityRow = {
  id: string;
  nombre: string;
  valor: number | null;
  moneda: string;
  estado: "activo" | "ganado" | "perdido" | "eliminado";
  empresa_id: string;
  asignado_id: string | null;
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  creado_en: string;
  campos_custom: Record<string, unknown> | null;
  pipeline_id: string;
  etapa_id: string;
  fecha_entrado_etapa: string | null;
  descripcion: string | null;
  empresa: EmbeddedRef<EmpresaRel>;
  contacto: EmbeddedRef<ContactoRel>;
  pipeline: EmbeddedRef<{ nombre: string }>;
  etapa_pipeline: EmbeddedRef<{ nombre: string }>;
  usuario: EmbeddedRef<{ nombre: string }>;
  oportunidad_producto?: { producto: EmbeddedRef<ProductoRel> }[] | null;
  historial_etapa?: { etapa_anterior: EmbeddedRef<{ id: string; nombre: string }> }[] | null;
};

// Subconjuntos de campos de las entidades relacionadas que se pueden filtrar
// desde la lista de oportunidades.
type EmpresaRel = {
  nombre: string; ciudad: string | null; pais: string | null;
  estado_empresa: string | null; origen: string | null;
  email: string | null; telefono: string | null;
};
type ContactoRel = {
  nombre: string; cargo: string | null; email: string | null;
  telefono: string | null; origen: string | null;
};
type ProductoRel = {
  nombre: string; categoria: string | null; destino: string | null;
  precio_desde: number | null; moneda: string | null;
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
  // Carga de pipelines con manejo de error: si falla, log y retorno vacio
  const { data: pipelines, error: pipelinesError } = await supabase
    .from("pipeline")
    .select("id, nombre, es_default")
    .order("es_default", { ascending: false })
    .order("nombre", { ascending: true });
  if (pipelinesError) {
    console.error("[getKanbanBoard] error cargando pipelines:", pipelinesError.message);
    return [];
  }

  const selectedPipelineId = pipeline_id ?? (pipelines ?? [])[0]?.id;
  if (!selectedPipelineId) return [];

  // Carga de etapas del pipeline seleccionado
  const { data: etapas, error: etapasError } = await supabase
    .from("etapa_pipeline")
    .select("id, nombre, orden, dias_maximo_alerta, pipeline_id")
    .eq("pipeline_id", selectedPipelineId)
    .order("orden", { ascending: true });
  if (etapasError) {
    console.error("[getKanbanBoard] error cargando etapas:", etapasError.message);
    return [];
  }

  // Carga de oportunidades activas del pipeline
  const { data: opportunities, error: oportunidadesError } = await supabase
    .from("oportunidad")
    .select("id, nombre, valor, moneda, etapa_id, fecha_entrado_etapa, empresa(nombre), usuario!oportunidad_asignado_id_fkey(nombre)")
    .eq("pipeline_id", selectedPipelineId)
    .eq("estado", "activo");
  if (oportunidadesError) {
    console.error("[getKanbanBoard] error cargando oportunidades:", oportunidadesError.message);
    return [];
  }

  const cardsByEtapa = new Map<string, KanbanCard[]>();
  const now = Date.now();
  for (const o of (opportunities ?? []) as RawKanbanOpp[]) {
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
  ids?: string[];
} = {}): Promise<OportunidadListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("oportunidad")
    .select(
      "id, nombre, valor, moneda, estado, empresa_id, asignado_id, pipeline_id, etapa_id, probabilidad_cierre, fecha_esperada_cierre, creado_en, fecha_entrado_etapa, descripcion, campos_custom, " +
        "empresa(nombre, ciudad, pais, estado_empresa, origen, email, telefono), " +
        "contacto(nombre, cargo, email, telefono, origen), " +
        "pipeline(nombre), etapa_pipeline(nombre), usuario!oportunidad_asignado_id_fkey(nombre), " +
        "oportunidad_producto(producto(nombre, categoria, destino, precio_desde, moneda)), " +
        "historial_etapa(etapa_anterior(id, nombre))",
    )
    .order("creado_en", { ascending: false })
    // Solo la última entrada del historial por oportunidad → su etapa_anterior.
    .order("cambiado_en", { ascending: false, foreignTable: "historial_etapa" })
    .limit(1, { foreignTable: "historial_etapa" })
    .limit(opts.ids?.length ? opts.ids.length : opts.limit ?? 200);

  if (opts.ids?.length) query = query.in("id", opts.ids);
  if (opts.q) {
    query = query.ilike("nombre", `%${opts.q}%`);
  }
  if (opts.estado && opts.estado !== "todos") {
    query = query.eq("estado", opts.estado);
  } else if (!opts.ids?.length) {
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

  // Cast: el embed anidado oportunidad_producto(producto(...)) confunde al tipo
  // inferido de PostgREST (lo vuelve GenericStringError). RawOpportunityRow es
  // la forma real de la fila.
  return ((data ?? []) as unknown as RawOpportunityRow[]).map((row) => {
    const oneOf = <T extends { nombre: string }>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? v[0] ?? null : v;
    const empresaRel = oneOf(row.empresa);
    const contactoRel = oneOf(row.contacto);
    const productosRel = (row.oportunidad_producto ?? [])
      .map((op) => oneOf(op.producto))
      .filter((p): p is ProductoRel => !!p);
    const etapaAnterior = oneOf((row.historial_etapa ?? [])[0]?.etapa_anterior ?? null);
    return {
      id: row.id,
      nombre: row.nombre,
      valor: row.valor,
      moneda: row.moneda,
      estado: row.estado,
      empresa_id: row.empresa_id,
      empresa_nombre: empresaRel?.nombre ?? "—",
      contacto_nombre: contactoRel?.nombre ?? "—",
      pipeline_id: row.pipeline_id,
      pipeline_nombre: oneOf(row.pipeline)?.nombre ?? "—",
      etapa_id: row.etapa_id,
      etapa_nombre: oneOf(row.etapa_pipeline)?.nombre ?? "—",
      etapa_anterior_id: etapaAnterior?.id ?? null,
      etapa_anterior_nombre: etapaAnterior?.nombre ?? null,
      fecha_entrado_etapa: row.fecha_entrado_etapa,
      descripcion: row.descripcion,
      asignado_id: row.asignado_id,
      asignado_nombre: oneOf(row.usuario)?.nombre ?? null,
      probabilidad_cierre: row.probabilidad_cierre,
      fecha_esperada_cierre: row.fecha_esperada_cierre,
      creado_en: row.creado_en,
      campos_custom: row.campos_custom ?? {},
      _rel: {
        empresa: empresaRel as Record<string, unknown> | null,
        contacto: contactoRel as Record<string, unknown> | null,
        productos: productosRel as Record<string, unknown>[],
      },
    };
  });
}
