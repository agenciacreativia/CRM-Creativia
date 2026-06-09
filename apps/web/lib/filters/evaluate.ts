/**
 * Pure predicate evaluator for the advanced filter. Works on plain row objects
 * that expose fixed columns at the top level and custom fields under
 * `campos_custom`. Used server-side after fetching, so all operators behave
 * identically for built-in and custom fields.
 */
import type { FilterCondition, FilterField, FilterSpec } from "./types";

function fieldValue(
  row: Record<string, unknown>,
  field: FilterField,
): unknown {
  if (field.custom) {
    const cc = (row.campos_custom ?? {}) as Record<string, unknown>;
    return cc[field.key];
  }
  return row[field.key];
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  // Limpiar el string: quitar todo lo que no sea dígito, punto o signo menos,
  // y luego conservar como máximo un signo menos inicial y un único punto decimal
  // para evitar que strings como "1.5-20" se interpreten como un número válido.
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const match = cleaned.match(/^-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

function asComparable(v: unknown, type: FilterField["type"]): number | null {
  if (type === "numero") return asNumber(v);
  if (type === "fecha") {
    if (isEmpty(v)) return null;
    const t = new Date(String(v)).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function evalCondition(
  row: Record<string, unknown>,
  cond: FilterCondition,
  fields: FilterField[],
): boolean {
  const field = fields.find((f) => f.key === cond.field);
  if (!field) return false;

  const raw = fieldValue(row, field);

  switch (cond.operator) {
    case "vacio":
      return isEmpty(raw);
    case "no_vacio":
      return !isEmpty(raw);
  }

  // text-ish comparisons
  const left = isEmpty(raw) ? "" : String(raw).toLowerCase();
  const right = cond.value.toLowerCase();

  if (field.type === "numero" || field.type === "fecha") {
    const l = asComparable(raw, field.type);
    const r =
      field.type === "fecha"
        ? cond.value
          ? new Date(cond.value).getTime()
          : null
        : asNumber(cond.value);
    switch (cond.operator) {
      case "es":
        return l !== null && r !== null && l === r;
      case "no_es":
        return !(l !== null && r !== null && l === r);
      case "mayor":
        return l !== null && r !== null && l > r;
      case "menor":
        return l !== null && r !== null && l < r;
      case "mayor_igual":
        return l !== null && r !== null && l >= r;
      case "menor_igual":
        return l !== null && r !== null && l <= r;
      default:
        return false;
    }
  }

  if (field.type === "booleano") {
    const truthy = raw === true || left === "true" || left === "sí" || left === "si" || left === "1";
    const want = right === "true" || right === "sí" || right === "si" || right === "1";
    return cond.operator === "es" ? truthy === want : truthy !== want;
  }

  // texto + seleccion
  switch (cond.operator) {
    case "es":
      return left === right;
    case "no_es":
      return left !== right;
    case "contiene":
      return left.includes(right);
    case "no_contiene":
      return !left.includes(right);
    default:
      return false;
  }
}

/** Evaluate the full spec against one row. */
export function rowMatches(
  row: Record<string, unknown>,
  spec: FilterSpec,
  fields: FilterField[],
): boolean {
  const andOk =
    spec.and.length === 0 || spec.and.every((c) => evalCondition(row, c, fields));
  const orOk =
    spec.or.length === 0 || spec.or.some((c) => evalCondition(row, c, fields));
  return andOk && orOk;
}
