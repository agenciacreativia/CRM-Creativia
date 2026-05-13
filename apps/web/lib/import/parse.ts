import "server-only";
import * as XLSX from "xlsx";

/**
 * Parsing layer for the Sprint 2 Excel importer.
 *
 * Accepts the three files Juan provided as templates:
 *   - empresas.xlsx
 *   - contacto.xlsx
 *   - oportunidades.xlsx
 *
 * Returns normalized records ready for the preview/commit layer.
 * Pure logic — no DB access here.
 */

export type ParsedEmpresa = {
  rowIndex: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  sitio_web: string | null;
  ciudad: string | null;
  pais: string | null;
  propietario: string | null;
};

export type ParsedContacto = {
  rowIndex: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  propietario: string | null;
};

export type ParsedOportunidad = {
  rowIndex: number;
  nombre: string;
  email: string | null;
  estado_raw: string | null;       // "Abierto" | "Eliminado" | "Perdido" | "Ganado"
  etapa_nombre: string | null;     // pipeline stage name (string)
  pipeline_nombre: string | null;  // pipeline name (Embudo)
  propietario: string | null;
};

function sheetToRows(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function requireStr(v: unknown, field: string, rowIndex: number): string {
  const s = str(v);
  if (!s) throw new Error(`Fila ${rowIndex + 2}: falta el campo "${field}"`);
  return s;
}

/**
 * Locate a key in a row that matches one of the candidates (case-insensitive,
 * trims accents). Returns the raw value or null.
 */
function pick(row: Record<string, unknown>, ...candidates: string[]): unknown {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const want = candidates.map(norm);
  for (const [k, v] of Object.entries(row)) {
    if (want.includes(norm(k))) return v;
  }
  return null;
}

export function parseEmpresas(buffer: ArrayBuffer): ParsedEmpresa[] {
  const rows = sheetToRows(buffer);
  return rows.map((row, i) => ({
    rowIndex: i,
    nombre: requireStr(pick(row, "Nombre", "Empresa"), "Nombre", i),
    email: str(pick(row, "Correo", "Email")),
    telefono: str(pick(row, "Telefono")),
    direccion: str(pick(row, "Direccion", "Dirección")),
    sitio_web: str(pick(row, "Sitio web", "SitioWeb", "Web")),
    ciudad: str(pick(row, "Ciudad")),
    pais: str(pick(row, "Pais", "País")),
    propietario: str(pick(row, "Propietario", "Owner")),
  }));
}

export function parseContactos(buffer: ArrayBuffer): ParsedContacto[] {
  const rows = sheetToRows(buffer);
  return rows.map((row, i) => {
    const nombre = str(pick(row, "Nombre"));
    const apellido = str(pick(row, "Apellido"));
    const fullName = [nombre, apellido].filter(Boolean).join(" ");
    if (!fullName) throw new Error(`Fila ${i + 2}: falta Nombre y Apellido`);
    return {
      rowIndex: i,
      nombre: fullName,
      email: str(pick(row, "Correo", "Email")),
      telefono: str(pick(row, "Telefono")),
      propietario: str(pick(row, "Propietario", "Owner")),
    };
  });
}

export function parseOportunidades(buffer: ArrayBuffer): ParsedOportunidad[] {
  const rows = sheetToRows(buffer);
  return rows.map((row, i) => ({
    rowIndex: i,
    nombre: requireStr(pick(row, "Nombre"), "Nombre", i),
    email: str(pick(row, "Correo", "Email")),
    estado_raw: str(pick(row, "Estado")),
    etapa_nombre: str(pick(row, "Etapa")),
    pipeline_nombre: str(pick(row, "Embudo", "Pipeline")),
    propietario: str(pick(row, "Propietario", "Owner")),
  }));
}

/**
 * Maps the user's `Estado` strings to our enum.
 */
export function mapEstado(raw: string | null): "activo" | "ganado" | "perdido" | "eliminado" {
  const v = (raw ?? "").toLowerCase();
  if (v.startsWith("gan")) return "ganado";
  if (v.startsWith("perd")) return "perdido";
  if (v.startsWith("elim")) return "eliminado";
  return "activo"; // Abierto + any unknown defaults to activo
}
