/**
 * In-memory sort for list rows, driven by a `field:dir` string (e.g.
 * "nombre:asc"). Reuses the filter field catalog for type-aware comparison.
 */
import type { FilterField } from "./types";

function fieldValue(row: Record<string, unknown>, field: FilterField): unknown {
  if (field.custom) {
    const cc = (row.campos_custom ?? {}) as Record<string, unknown>;
    return cc[field.key];
  }
  return row[field.key];
}

function compare(a: unknown, b: unknown, type: FilterField["type"]): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // empties last
  if (bEmpty) return -1;

  if (type === "numero") {
    return Number(a) - Number(b);
  }
  if (type === "fecha") {
    return new Date(String(a)).getTime() - new Date(String(b)).getTime();
  }
  return String(a).localeCompare(String(b), "es", { sensitivity: "base" });
}

export function parseOrden(orden: string | undefined): { key: string; dir: "asc" | "desc" } | null {
  if (!orden) return null;
  const [key, dir] = orden.split(":");
  if (!key) return null;
  return { key, dir: dir === "desc" ? "desc" : "asc" };
}

export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  orden: string | undefined,
  fields: FilterField[],
): T[] {
  const parsed = parseOrden(orden);
  if (!parsed) return rows;
  const field = fields.find((f) => f.key === parsed.key);
  if (!field) return rows;
  const mul = parsed.dir === "desc" ? -1 : 1;
  return [...rows].sort(
    (a, b) => compare(fieldValue(a, field), fieldValue(b, field), field.type) * mul,
  );
}
