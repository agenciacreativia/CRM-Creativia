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
  estado_distribution: { name: string; value: number }[];
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
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const supabase = await createServerSupabase();
  const scope: Scope = user.rol === "admin" ? "admin" : "me";

  // ---------- Opportunities (filtered by RLS — asesor sees only own) ----------
  let oppQuery = supabase
    .from("oportunidad")
    .select("id, valor, moneda, estado, asignado_id, motivo_perdida_id, etapa_id, etapa_pipeline(nombre), motivo_perdida(nombre)");
  if (scope === "me") oppQuery = oppQuery.eq("asignado_id", user.id);
  const { data: opps } = await oppQuery;
  const opportunities = (opps ?? []) as Array<{
    id: string;
    valor: number | null;
    moneda: string;
    estado: "activo" | "ganado" | "perdido" | "eliminado";
    asignado_id: string | null;
    motivo_perdida_id: string | null;
    etapa_id: string;
    etapa_pipeline: { nombre: string } | { nombre: string }[] | null;
    motivo_perdida: { nombre: string } | { nombre: string }[] | null;
  }>;

  const oneOf = <T extends { nombre: string }>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

  // ---------- KPIs ----------
  const activas = opportunities.filter((o) => o.estado === "activo");
  const ganadas = opportunities.filter((o) => o.estado === "ganado");
  const perdidas = opportunities.filter((o) => o.estado === "perdido");
  const valor_pipeline = activas.reduce((s, o) => s + (o.valor ?? 0), 0);
  const winDecided = ganadas.length + perdidas.length;
  const win_rate = winDecided > 0 ? Math.round((ganadas.length / winDecided) * 100) : null;

  // ---------- Activities ----------
  let actQuery = supabase
    .from("actividad")
    .select("id, oportunidad_id, tipo, descripcion, fecha_programada, completada, oportunidad(nombre, asignado_id)")
    .eq("completada", false)
    .order("fecha_programada", { ascending: true, nullsFirst: false })
    .limit(15);
  const { data: acts } = await actQuery;
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

  // ---------- Chart: origen empresas ----------
  const { data: empresas } = await supabase.from("empresa").select("origen");
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

  // ---------- Chart: estado distribution ----------
  const estado_distribution = [
    { name: "Activas", value: activas.length },
    { name: "Ganadas", value: ganadas.length },
    { name: "Perdidas", value: perdidas.length },
  ];

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
    const { data: users } = await supabase
      .from("usuario")
      .select("id, nombre, rol")
      .eq("activo", true);
    const { data: completadas } = await supabase
      .from("actividad")
      .select("creado_por")
      .eq("completada", true);
    const completedByUser = new Map<string, number>();
    for (const c of completadas ?? []) {
      const k = (c as { creado_por: string | null }).creado_por;
      if (!k) continue;
      completedByUser.set(k, (completedByUser.get(k) ?? 0) + 1);
    }
    asesores = (users ?? []).map((u: { id: string; nombre: string; rol: string }) => {
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

  // moneda guess: most common moneda in active opps, default USD
  const monedaCount = new Map<string, number>();
  for (const o of activas) monedaCount.set(o.moneda, (monedaCount.get(o.moneda) ?? 0) + 1);
  const moneda_pipeline = [...monedaCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";

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
      estado_distribution,
      motivos_perdida,
    },
    asesores,
    actividades_proximas,
  };
}
