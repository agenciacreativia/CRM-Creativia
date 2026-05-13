import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type ExportInclude = {
  empresas: boolean;
  contactos: boolean;
  oportunidades: boolean;
  actividades: boolean;
  notas: boolean;
  sedes: boolean;
  pipelines: boolean;
  motivos: boolean;
  campos: boolean;
};

export type ExportBundle = {
  schemaVersion: "1.0";
  exportDate: string;
  tenantId: string;
  tenantName: string;
  metadata: { totalRecords: Record<string, number> };
  data: Record<string, unknown[]>;
};

export const ALL_INCLUDE: ExportInclude = {
  empresas: true,
  contactos: true,
  oportunidades: true,
  actividades: true,
  notas: true,
  sedes: true,
  pipelines: true,
  motivos: true,
  campos: true,
};

/**
 * Loads all selected tables for the current tenant and returns a
 * portable JSON bundle. RLS enforces the tenant scope automatically.
 */
export async function buildExport(args: {
  include: ExportInclude;
  tenantId: string;
  tenantName: string;
}): Promise<ExportBundle> {
  const supabase = await createServerSupabase();
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  const fetchAll = async (table: string, select = "*") => {
    const { data: rows, error } = await supabase.from(table).select(select).limit(10000);
    if (error) throw new Error(`export ${table}: ${error.message}`);
    return rows ?? [];
  };

  if (args.include.empresas) {
    const rows = await fetchAll("empresa");
    data.empresas = rows;
    counts.empresas = rows.length;
  }
  if (args.include.sedes) {
    const rows = await fetchAll("sede");
    data.sedes = rows;
    counts.sedes = rows.length;
  }
  if (args.include.contactos) {
    const rows = await fetchAll("contacto");
    data.contactos = rows;
    counts.contactos = rows.length;
  }
  if (args.include.pipelines) {
    const pipelines = await fetchAll("pipeline");
    const etapas = await fetchAll("etapa_pipeline");
    data.pipelines = pipelines;
    data.etapas = etapas;
    counts.pipelines = pipelines.length;
    counts.etapas = etapas.length;
  }
  if (args.include.motivos) {
    const rows = await fetchAll("motivo_perdida");
    data.motivos_perdida = rows;
    counts.motivos_perdida = rows.length;
  }
  if (args.include.oportunidades) {
    const rows = await fetchAll("oportunidad");
    data.oportunidades = rows;
    counts.oportunidades = rows.length;
    const hist = await fetchAll("historial_etapa");
    data.historial_etapa = hist;
    counts.historial_etapa = hist.length;
  }
  if (args.include.actividades) {
    const rows = await fetchAll("actividad");
    data.actividades = rows;
    counts.actividades = rows.length;
  }
  if (args.include.notas) {
    const rows = await fetchAll("nota");
    data.notas = rows;
    counts.notas = rows.length;
  }
  if (args.include.campos) {
    const rows = await fetchAll("campo_personalizado");
    data.campo_personalizado = rows;
    counts.campo_personalizado = rows.length;
  }

  return {
    schemaVersion: "1.0",
    exportDate: new Date().toISOString(),
    tenantId: args.tenantId,
    tenantName: args.tenantName,
    metadata: { totalRecords: counts },
    data,
  };
}

/**
 * Converts an array of row objects to a CSV string. Handles strings,
 * numbers, booleans, dates, null, and nested objects (JSON-stringified).
 */
export function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const keys = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v).replace(/"/g, '""');
    const s = String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = keys.map(escape).join(",");
  const lines = rows.map((row) => keys.map((k) => `"${escape(row[k])}"`).join(","));
  return [header, ...lines].join("\n");
}
