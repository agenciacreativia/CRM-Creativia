/**
 * Advanced filter builder — shared types (client + server safe).
 *
 * A FilterSpec has two groups:
 *   - `and`: ALL conditions must match (intersection)
 *   - `or` : ANY condition matches (union)
 * The final predicate is: (all AND conditions) AND (any OR condition).
 */

export type FilterType = "texto" | "numero" | "fecha" | "seleccion" | "booleano";

export type FilterOperator =
  | "es" // equals
  | "no_es" // not equals
  | "contiene" // contains (text)
  | "no_contiene" // not contains (text)
  | "mayor" // >
  | "menor" // <
  | "mayor_igual" // >=
  | "menor_igual" // <=
  | "vacio" // is empty / null
  | "no_vacio"; // is not empty / not null

export type FilterField = {
  key: string; // column name, or custom field "clave"
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[]; // for "seleccion"
  custom?: boolean; // lives in campos_custom JSONB
};

export type FilterCondition = {
  /**
   * Módulo de la condición: "oportunidad" | "empresa" | "contacto" | "producto".
   * Si falta (specs viejos), el motor asume el módulo ancla de la lista.
   */
  module?: string;
  field: string; // FilterField.key
  operator: FilterOperator;
  value: string;
};

export type FilterSpec = {
  and: FilterCondition[];
  or: FilterCondition[];
};

export const EMPTY_SPEC: FilterSpec = { and: [], or: [] };

/** Which operators make sense for each field type. */
export const OPERATORS_BY_TYPE: Record<FilterType, FilterOperator[]> = {
  texto: ["es", "no_es", "contiene", "no_contiene", "vacio", "no_vacio"],
  numero: ["es", "no_es", "mayor", "menor", "mayor_igual", "menor_igual", "vacio", "no_vacio"],
  fecha: ["es", "no_es", "mayor", "menor", "mayor_igual", "menor_igual", "vacio", "no_vacio"],
  seleccion: ["es", "no_es", "vacio", "no_vacio"],
  booleano: ["es"],
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  es: "es",
  no_es: "no es",
  contiene: "contiene",
  no_contiene: "no contiene",
  mayor: "es mayor que",
  menor: "es menor que",
  mayor_igual: "es mayor o igual",
  menor_igual: "es menor o igual",
  vacio: "está vacío",
  no_vacio: "no está vacío",
};

/** Operators that don't need a value input. */
export const VALUELESS_OPERATORS: FilterOperator[] = ["vacio", "no_vacio"];

/** True if the spec has at least one usable condition. */
export function specHasConditions(spec: FilterSpec | null | undefined): boolean {
  if (!spec) return false;
  return spec.and.length > 0 || spec.or.length > 0;
}

/** Serialize to a compact, URL-safe string. */
export function encodeFilterSpec(spec: FilterSpec): string {
  return encodeURIComponent(JSON.stringify(spec));
}

/** Parse from a URL string; returns null on any problem. */
export function decodeFilterSpec(raw: string | null | undefined): FilterSpec | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<FilterSpec>;
    const norm = (arr: unknown): FilterCondition[] =>
      Array.isArray(arr)
        ? arr.filter(
            (c): c is FilterCondition =>
              !!c &&
              typeof (c as FilterCondition).field === "string" &&
              typeof (c as FilterCondition).operator === "string",
          )
        : [];
    return { and: norm(parsed.and), or: norm(parsed.or) };
  } catch {
    return null;
  }
}
