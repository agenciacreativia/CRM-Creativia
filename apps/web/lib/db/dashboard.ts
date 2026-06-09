import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type DashboardKpis = {
  oportunidades_activas: number;
  valor_pipeline: number;
  moneda_pipeline: string;
  win_rate: number | null;
  actividades_pendientes: number;
};

export type DashboardCharts = {
  origen_empresas: { name: string; value: number }[];
  oportunidades_por_etapa: { name: string; value: number }[];
  motivos_perdida: { name: string; value: number }[];
};

export type AsesorDesempeno = {
  id: string;
  nombre: string;
  oportunidades_asignadas: number;
  ganadas: number;
  perdidas: number;
  win_rate: number | null;
  actividades_completadas: number;
};

export type DashboardActivityItem = {
  id: string;
  oportunidad_id: string;
  oportunidad_nombre: string;
  tipo: "llamada" | "email" | "whatsapp" | "reunion" | "otra";
  descripcion: string | null;
  fecha_programada: string | null;
};

// Block A — "Mi atención hoy"
export type AtencionHoy = {
  actividades_vencidas: DashboardActivityItem[];
  actividades_esta_semana: DashboardActivityItem[];
  oportunidades_estancadas: EstancadaItem[];
  oportunidades_sin_actividad: SinActividadItem[];
};

export type EstancadaItem = {
  id: string;
  nombre: string;
  empresa_nombre: string;
  etapa_nombre: string;
  dias_en_etapa: number;
  dias_maximo: number;
  valor: number | null;
  moneda: string;
};

export type SinActividadItem = {
  id: string;
  nombre: string;
  empresa_nombre: string;
  dias_sin_actividad: number;
  valor: number | null;
  moneda: string;
};

// Block B — Forecast
export type Forecast = {
  valor_mes_actual: number;
  cuenta_mes_actual: number;
  valor_semana: number;
  cuenta_semana: number;
  velocidad_dias: number | null;
  por_mes: { mes: string; valor: number }[]; // próximos 3 meses
  moneda: string;
};

// Block C — Embudo de conversión (pipeline default)
export type EmbudoEtapa = {
  nombre: string;
  orden: number;
  alcanzaron: number; // # oportunidades que pasaron por (o están en) esta etapa
  conversion_pct: number | null; // % vs etapa anterior
};

type Scope = "admin" | "me";

/**
 * Aggregates all dashboard data. Asesores see only their own opportunities
 * (filtered by asignado_id); admin sees everything in the tenant.
 *
 * Built on top of plain Supabase queries since RLS already enforces the
 * tenant scope. Aggregations happen in JS — fine for the volumes expected
 * (low thousands of opportunities per tenant).
 */
export async function loadDashboard(): Promise<{
  scope: Scope;
  kpis: DashboardKpis;
  charts: DashboardCharts;
  asesores: AsesorDesempeno[];
  actividades_proximas: DashboardActivityItem[];
  atencion: AtencionHoy;
  forecast: Forecast;
  embudo: EmbudoEtapa[];
  embudo_pipeline_nombre: string | null;
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const supabase = await createServerSupabase();
  const scope: Scope = user.rol === "admin" ? "admin" : "me";

  // Fire every query in parallel — they're independent.
  const oppSelect = supabase
    .from("oportunidad")
    .select(
      "id, nombre, valor, moneda, estado, asignado_id, motivo_perdida_id, etapa_id, pipeline_id, fecha_esperada_cierre, fecha_entrado_etapa, creado_en, empresa(nombre), etapa_pipeline(nombre, orden, dias_maximo_alerta), motivo_perdida(nombre)",
    );
  const oppPromise = scope === "me" ? oppSelect.eq("asignado_id", user.id) : oppSelect;

  // Pull all pending activities (not just 15) — we need them for "vencidas" too.
  // No traemos `completada` porque ya filtramos por ese campo en el .eq().
  const actsPromise = supabase
    .from("actividad")
    .select("id, oportunidad_id, tipo, descripcion, fecha_programada, oportunidad(nombre, asignado_id)")
    .eq("completada", false)
    .order("fecha_programada", { ascending: true, nullsFirst: false });

  // Last activity (any state) per opportunity — for "sin actividad reciente".
  const lastActsPromise = supabase
    .from("actividad")
    .select("oportunidad_id, fecha_programada, fecha_completada, creado_en");

  const empresasPromise = supabase.from("empresa").select("origen");

  const usersPromise = scope === "admin"
    ? supabase.from("usuario").select("id, nombre, rol").eq("activo", true)
    : Promise.resolve({ data: [] as Array<{ id: string; nombre: string; rol: string }> });

  const completadasPromise = scope === "admin"
    ? supabase.from("actividad").select("creado_por").eq("completada", true)
    : Promise.resolve({ data: [] as Array<{ creado_por: string | null }> });

  // Default pipeline (for funnel).
  const pipelinePromise = supabase
    .from("pipeline")
    .select("id, nombre, es_default")
    .order("es_default", { ascending: false })
    .order("nombre", { ascending: true })
    .limit(1);

  // historial_etapa entries — for velocity (ganadas) calculation.
  const histPromise = supabase
    .from("historial_etapa")
    .select("oportunidad_id, cambiado_en")
    .order("cambiado_en", { ascending: false });

  const [
    { data: opps },
    { data: acts },
    { data: lastActs },
    { data: empresas },
    { data: users },
    { data: completadas },
    { data: pipelines },
    { data: histRows },
  ] = await Promise.all([
    oppPromise,
    actsPromise,
    lastActsPromise,
    empresasPromise,
    usersPromise,
    completadasPromise,
    pipelinePromise,
    histPromise,
  ]);

  const opportunities = (opps ?? []) as Array<{
    id: string;
    nombre: string;
    valor: number | null;
    moneda: string;
    estado: "activo" | "ganado" | "perdido" | "eliminado";
    asignado_id: string | null;
    motivo_perdida_id: string | null;
    etapa_id: string;
    pipeline_id: string;
    fecha_esperada_cierre: string | null;
    fecha_entrado_etapa: string;
    creado_en: string;
    empresa: { nombre: string } | { nombre: string }[] | null;
    etapa_pipeline:
      | { nombre: string; orden: number; dias_maximo_alerta: number | null }
      | { nombre: string; orden: number; dias_maximo_alerta: number | null }[]
      | null;
    motivo_perdida: { nombre: string } | { nombre: string }[] | null;
  }>;

  const oneOf = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

  const now = new Date();
  const nowMs = now.getTime();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfWeek = startOfDay + 7 * 24 * 60 * 60 * 1000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  // ---------- KPIs ----------
  const activas = opportunities.filter((o) => o.estado === "activo");
  const ganadas = opportunities.filter((o) => o.estado === "ganado");
  const perdidas = opportunities.filter((o) => o.estado === "perdido");
  const valor_pipeline = activas.reduce((s, o) => s + (o.valor ?? 0), 0);
  const winDecided = ganadas.length + perdidas.length;
  const win_rate = winDecided > 0 ? Math.round((ganadas.length / winDecided) * 100) : null;

  // ---------- Activities (pending) ----------
  type RawAct = {
    id: string;
    oportunidad_id: string;
    tipo: "llamada" | "email" | "whatsapp" | "reunion" | "otra";
    descripcion: string | null;
    fecha_programada: string | null;
    oportunidad: { nombre: string; asignado_id: string | null } | { nombre: string; asignado_id: string | null }[] | null;
  };
  const allActs = ((acts ?? []) as RawAct[]).map((a) => ({
    ...a,
    opp: Array.isArray(a.oportunidad) ? a.oportunidad[0] : a.oportunidad,
  }));
  const pendingActs = scope === "me"
    ? allActs.filter((a) => a.opp?.asignado_id === user.id)
    : allActs;

  const actividades_pendientes = pendingActs.length;
  const actividades_proximas: DashboardActivityItem[] = pendingActs.slice(0, 5).map((a) => ({
    id: a.id,
    oportunidad_id: a.oportunidad_id,
    oportunidad_nombre: a.opp?.nombre ?? "—",
    tipo: a.tipo,
    descripcion: a.descripcion,
    fecha_programada: a.fecha_programada,
  }));

  // ---------- Block A: "Mi atención hoy" ----------
  const toItem = (a: typeof pendingActs[number]): DashboardActivityItem => ({
    id: a.id,
    oportunidad_id: a.oportunidad_id,
    oportunidad_nombre: a.opp?.nombre ?? "—",
    tipo: a.tipo,
    descripcion: a.descripcion,
    fecha_programada: a.fecha_programada,
  });
  const actividades_vencidas = pendingActs
    .filter((a) => a.fecha_programada != null && new Date(a.fecha_programada).getTime() < startOfDay)
    .slice(0, 10)
    .map(toItem);
  const actividades_esta_semana = pendingActs
    .filter((a) => {
      if (!a.fecha_programada) return false;
      const t = new Date(a.fecha_programada).getTime();
      return t >= startOfDay && t < endOfWeek;
    })
    .slice(0, 10)
    .map(toItem);

  // Oportunidades estancadas: activas cuya etapa tiene `dias_maximo_alerta`
  // y cuyo `dias_en_etapa` ya lo superó.
  const oportunidades_estancadas: EstancadaItem[] = activas
    .map((o) => {
      const etapa = oneOf(o.etapa_pipeline);
      if (!etapa || etapa.dias_maximo_alerta == null) return null;
      const dias = Math.floor((nowMs - new Date(o.fecha_entrado_etapa).getTime()) / (1000 * 60 * 60 * 24));
      if (dias <= etapa.dias_maximo_alerta) return null;
      return {
        id: o.id,
        nombre: o.nombre,
        empresa_nombre: oneOf(o.empresa)?.nombre ?? "—",
        etapa_nombre: etapa.nombre,
        dias_en_etapa: dias,
        dias_maximo: etapa.dias_maximo_alerta,
        valor: o.valor,
        moneda: o.moneda,
      } as EstancadaItem;
    })
    .filter((x): x is EstancadaItem => x !== null)
    .sort((a, b) => b.dias_en_etapa - a.dias_en_etapa)
    .slice(0, 10);

  // Última actividad por oportunidad (cualquier tipo, completada o no).
  // Usamos el max entre fecha_programada, fecha_completada y creado_en.
  type LastActRow = {
    oportunidad_id: string;
    fecha_programada: string | null;
    fecha_completada: string | null;
    creado_en: string;
  };
  const ultimaActPorOpp = new Map<string, number>();
  for (const a of (lastActs ?? []) as LastActRow[]) {
    const candidates = [a.fecha_programada, a.fecha_completada, a.creado_en]
      .filter((s): s is string => !!s)
      .map((s) => new Date(s).getTime());
    if (candidates.length === 0) continue;
    const t = Math.max(...candidates);
    const prev = ultimaActPorOpp.get(a.oportunidad_id) ?? 0;
    if (t > prev) ultimaActPorOpp.set(a.oportunidad_id, t);
  }
  const DIAS_SIN_ACT_UMBRAL = 14;
  const oportunidades_sin_actividad: SinActividadItem[] = activas
    .map((o) => {
      const ultima = ultimaActPorOpp.get(o.id) ?? new Date(o.creado_en).getTime();
      const diasSin = Math.floor((nowMs - ultima) / (1000 * 60 * 60 * 24));
      if (diasSin < DIAS_SIN_ACT_UMBRAL) return null;
      return {
        id: o.id,
        nombre: o.nombre,
        empresa_nombre: oneOf(o.empresa)?.nombre ?? "—",
        dias_sin_actividad: diasSin,
        valor: o.valor,
        moneda: o.moneda,
      } as SinActividadItem;
    })
    .filter((x): x is SinActividadItem => x !== null)
    .sort((a, b) => b.dias_sin_actividad - a.dias_sin_actividad)
    .slice(0, 10);

  const atencion: AtencionHoy = {
    actividades_vencidas,
    actividades_esta_semana,
    oportunidades_estancadas,
    oportunidades_sin_actividad,
  };

  // ---------- Block B: Forecast ----------
  let valor_mes_actual = 0;
  let cuenta_mes_actual = 0;
  let valor_semana = 0;
  let cuenta_semana = 0;
  const valorPorMes = new Map<string, number>();
  // Inicializa los próximos 3 meses con 0 para que siempre aparezcan.
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    valorPorMes.set(key, 0);
  }
  const startOfNext3 = new Date(now.getFullYear(), now.getMonth() + 3, 1).getTime();

  for (const o of activas) {
    if (!o.fecha_esperada_cierre) continue;
    const t = new Date(o.fecha_esperada_cierre).getTime();
    const v = o.valor ?? 0;
    if (t >= startOfMonth && t < startOfNextMonth) {
      valor_mes_actual += v;
      cuenta_mes_actual += 1;
    }
    if (t >= startOfDay && t < endOfWeek) {
      valor_semana += v;
      cuenta_semana += 1;
    }
    if (t >= startOfMonth && t < startOfNext3) {
      const d = new Date(t);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      valorPorMes.set(key, (valorPorMes.get(key) ?? 0) + v);
    }
  }
  // Velocidad: días promedio desde creado_en hasta el último cambio de etapa,
  // para oportunidades ganadas en los últimos 365 días.
  const histByOpp = new Map<string, number>(); // max(cambiado_en) por opp
  for (const h of (histRows ?? []) as { oportunidad_id: string; cambiado_en: string }[]) {
    const t = new Date(h.cambiado_en).getTime();
    const prev = histByOpp.get(h.oportunidad_id) ?? 0;
    if (t > prev) histByOpp.set(h.oportunidad_id, t);
  }
  const oneYearAgo = nowMs - 365 * 24 * 60 * 60 * 1000;
  const ganadasReciente = ganadas.filter(
    (o) => new Date(o.creado_en).getTime() >= oneYearAgo,
  );
  let velocidad_dias: number | null = null;
  if (ganadasReciente.length > 0) {
    const dias = ganadasReciente.map((o) => {
      const created = new Date(o.creado_en).getTime();
      const closed = histByOpp.get(o.id) ?? nowMs;
      return Math.max(0, Math.floor((closed - created) / (1000 * 60 * 60 * 24)));
    });
    velocidad_dias = Math.round(dias.reduce((s, d) => s + d, 0) / dias.length);
  }

  const monedaCount = new Map<string, number>();
  for (const o of activas) monedaCount.set(o.moneda, (monedaCount.get(o.moneda) ?? 0) + 1);
  const moneda_pipeline = [...monedaCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";

  const por_mes = [...valorPorMes.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, valor]) => {
      const [y, m] = key.split("-").map((s) => parseInt(s, 10));
      const d = new Date(y, m - 1, 1);
      const nombre = d.toLocaleString("es", { month: "short" });
      return { mes: nombre.charAt(0).toUpperCase() + nombre.slice(1), valor };
    });

  const forecast: Forecast = {
    valor_mes_actual,
    cuenta_mes_actual,
    valor_semana,
    cuenta_semana,
    velocidad_dias,
    por_mes,
    moneda: moneda_pipeline,
  };

  // ---------- Block C: Embudo de conversión (pipeline default) ----------
  const defaultPipeline = (pipelines ?? [])[0] as { id: string; nombre: string } | undefined;
  let embudo: EmbudoEtapa[] = [];
  let embudo_pipeline_nombre: string | null = null;
  if (defaultPipeline) {
    embudo_pipeline_nombre = defaultPipeline.nombre;
    // Sólo opp del pipeline default. Una opp "alcanzó" la etapa N si su etapa
    // actual tiene `orden >= N` (independiente de estado), y las ganadas
    // implícitamente pasaron por todas.
    const oppsInPipe = opportunities.filter(
      (o) => o.pipeline_id === defaultPipeline.id && o.estado !== "eliminado",
    );
    // Listar etapas distintas vistas + sus órdenes
    const etapaByOrden = new Map<number, string>();
    for (const o of oppsInPipe) {
      const e = oneOf(o.etapa_pipeline);
      if (e) etapaByOrden.set(e.orden, e.nombre);
    }
    const ordenes = [...etapaByOrden.keys()].sort((a, b) => a - b);
    // alcanzaron(N) = opps con etapa.orden >= N  (ganadas también: están en última)
    embudo = ordenes.map((orden) => {
      const alcanzaron = oppsInPipe.filter((o) => {
        const e = oneOf(o.etapa_pipeline);
        if (!e) return false;
        // Una oportunidad ganada alcanzó todas las etapas.
        if (o.estado === "ganado") return true;
        return e.orden >= orden;
      }).length;
      return {
        nombre: etapaByOrden.get(orden)!,
        orden,
        alcanzaron,
        conversion_pct: null as number | null,
      };
    });
    // Tasa de conversión: alcanzaron(N) / alcanzaron(N-1)
    for (let i = 1; i < embudo.length; i++) {
      const prev = embudo[i - 1].alcanzaron;
      embudo[i].conversion_pct = prev > 0 ? Math.round((embudo[i].alcanzaron / prev) * 100) : null;
    }
  }

  // ---------- Chart: origen empresas ----------
  const origenCount = new Map<string, number>();
  for (const e of empresas ?? []) {
    const k = (e as { origen: string | null }).origen ?? "sin especificar";
    origenCount.set(k, (origenCount.get(k) ?? 0) + 1);
  }
  const origen_empresas = [...origenCount.entries()].map(([name, value]) => ({ name, value }));

  // ---------- Chart: oportunidades por etapa (estado activo only) ----------
  const etapaCount = new Map<string, number>();
  for (const o of activas) {
    const k = oneOf(o.etapa_pipeline)?.nombre ?? "—";
    etapaCount.set(k, (etapaCount.get(k) ?? 0) + 1);
  }
  const oportunidades_por_etapa = [...etapaCount.entries()].map(([name, value]) => ({ name, value }));

  // ---------- Chart: motivos pérdida top ----------
  const motivoCount = new Map<string, number>();
  for (const o of perdidas) {
    const k = oneOf(o.motivo_perdida)?.nombre ?? "(sin motivo)";
    motivoCount.set(k, (motivoCount.get(k) ?? 0) + 1);
  }
  const motivos_perdida = [...motivoCount.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // ---------- Tabla: desempeño por asesor (admin only) ----------
  let asesores: AsesorDesempeno[] = [];
  if (scope === "admin") {
    const completedByUser = new Map<string, number>();
    for (const c of completadas ?? []) {
      const k = c.creado_por;
      if (!k) continue;
      completedByUser.set(k, (completedByUser.get(k) ?? 0) + 1);
    }
    asesores = (users ?? []).map((u) => {
      const own = opportunities.filter((o) => o.asignado_id === u.id);
      const own_ganadas = own.filter((o) => o.estado === "ganado").length;
      const own_perdidas = own.filter((o) => o.estado === "perdido").length;
      const decided = own_ganadas + own_perdidas;
      return {
        id: u.id,
        nombre: u.nombre,
        oportunidades_asignadas: own.filter((o) => o.estado === "activo").length,
        ganadas: own_ganadas,
        perdidas: own_perdidas,
        win_rate: decided > 0 ? Math.round((own_ganadas / decided) * 100) : null,
        actividades_completadas: completedByUser.get(u.id) ?? 0,
      };
    }).sort((a, b) => b.oportunidades_asignadas - a.oportunidades_asignadas);
  }

  return {
    scope,
    kpis: {
      oportunidades_activas: activas.length,
      valor_pipeline,
      moneda_pipeline,
      win_rate,
      actividades_pendientes,
    },
    charts: {
      origen_empresas,
      oportunidades_por_etapa,
      motivos_perdida,
    },
    asesores,
    actividades_proximas,
    atencion,
    forecast,
    embudo,
    embudo_pipeline_nombre,
  };
}
