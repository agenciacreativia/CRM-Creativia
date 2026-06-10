import "server-only";
import * as XLSX from "xlsx";
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

  // Neutraliza inyección de fórmulas (CSV injection): si un valor empieza con
  // = + - @ tab o CR, Excel/Sheets lo interpreta como fórmula al abrir el CSV
  // (ej. =HYPERLINK(...), DDE). Lo prefijamos con comilla simple para forzar
  // que se trate como texto. Los datos vienen de campos libres del usuario.
  const neutralizarFormula = (s: string): string =>
    /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v).replace(/"/g, '""');
    const s = neutralizarFormula(String(v));
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = keys.map(escape).join(",");
  const lines = rows.map((row) => keys.map((k) => `"${escape(row[k])}"`).join(","));
  return [header, ...lines].join("\n");
}

/**
 * Renders a multi-sheet Excel workbook from an ExportBundle's `data`
 * object. Each top-level key becomes one sheet. Returns a Buffer ready
 * to send as the response body.
 */
export function bundleToExcel(bundle: ExportBundle): Buffer {
  const wb = XLSX.utils.book_new();

  // "Resumen" sheet with metadata
  const summary = [
    ["CRM Turistea — Backup"],
    ["Tenant", bundle.tenantName],
    ["Tenant ID", bundle.tenantId],
    ["Exportado", bundle.exportDate],
    ["Versión schema", bundle.schemaVersion],
    [],
    ["Totales por entidad"],
    ...Object.entries(bundle.metadata.totalRecords).map(([k, v]) => [k, v]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  for (const [sheetKey, rows] of Object.entries(bundle.data)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    // Flatten JSONB-style nested objects to strings so Excel cells stay sane.
    // Además neutralizamos inyección de fórmulas en strings (mismo riesgo que
    // en CSV): un valor que empieza con = + - @ se prefija con comilla simple.
    const flat = (rows as Record<string, unknown>[]).map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v !== null && typeof v === "object" && !(v instanceof Date)) {
          out[k] = JSON.stringify(v);
        } else if (typeof v === "string" && /^[=+\-@\t\r]/.test(v)) {
          out[k] = `'${v}`;
        } else {
          out[k] = v;
        }
      }
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    // Sheet names can't exceed 31 chars in xlsx
    const name = sheetKey.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Renders a single-sheet Excel workbook from a list of rows. Used by
 * the per-table CSV-or-Excel export endpoint.
 */
export function rowsToExcel(rows: Array<Record<string, unknown>>, sheetName: string): Buffer {
  const wb = XLSX.utils.book_new();
  const flat = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && typeof v === "object" && !(v instanceof Date)) {
        out[k] = JSON.stringify(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(flat);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
