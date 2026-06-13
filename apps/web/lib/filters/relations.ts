/**
 * Define, para cada LISTA (la entidad ancla de la página), qué MÓDULOS se
 * pueden filtrar y cómo llegar a sus datos desde una fila.
 *
 * - `self: true`  → la entidad de la lista; sus campos están en la raíz de la
 *   fila (row.nombre, row.valor…).
 * - `relKey`      → la entidad relacionada vive en `row._rel[relKey]` (un objeto
 *   para to-one como empresa/contacto, o un array para to-many como productos).
 * - `isMany`      → el relacionado es una lista (productos): la condición pasa si
 *   AL MENOS UNO cumple (semántica "tiene un relacionado que cumple").
 *
 * IMPORTANTE: cada condición se evalúa EXACTO contra el campo del módulo que
 * elige el usuario. "Empresa: ciudad = Bogotá" mira solo empresa.ciudad — nunca
 * el contacto. Los módulos son independientes; solo se cruzan por la relación
 * directa de la entidad ancla (la oportunidad tiene SU empresa, SU contacto).
 */

export type ListaKey = "oportunidad" | "empresa" | "contacto" | "producto";
export type ModuloKey = "oportunidad" | "empresa" | "contacto" | "producto";

export type FilterableModule = {
  key: ModuloKey;
  label: string;
  /** Entidad de la lista: campos en la raíz de la fila. */
  self?: boolean;
  /** Si no es self, dónde buscar en `row._rel`. */
  relKey?: "empresa" | "contacto" | "contactos" | "productos" | "oportunidades";
  /** El relacionado es un array (to-many). */
  isMany?: boolean;
};

/**
 * Relaciones filtrables por lista. Oportunidad es la entidad central (FK a
 * empresa/contacto, M-N a producto). Empresa y Contacto cruzan hacia sus
 * relacionados con semántica "tiene al menos uno que cumple" para los to-many
 * (una empresa tiene muchos contactos/oportunidades). Ver el enriquecimiento
 * de `_rel` en cada lib/db/*.ts.
 */
export const FILTERABLE_BY_LIST: Record<ListaKey, FilterableModule[]> = {
  oportunidad: [
    { key: "oportunidad", label: "Oportunidad", self: true },
    { key: "empresa", label: "Empresa", relKey: "empresa" },
    { key: "contacto", label: "Contacto", relKey: "contacto" },
    { key: "producto", label: "Producto", relKey: "productos", isMany: true },
  ],
  empresa: [
    { key: "empresa", label: "Empresa", self: true },
    { key: "contacto", label: "Contacto", relKey: "contactos", isMany: true },
    { key: "oportunidad", label: "Oportunidad", relKey: "oportunidades", isMany: true },
  ],
  contacto: [
    { key: "contacto", label: "Contacto", self: true },
    { key: "empresa", label: "Empresa", relKey: "empresa" },
    { key: "oportunidad", label: "Oportunidad", relKey: "oportunidades", isMany: true },
  ],
  producto: [{ key: "producto", label: "Producto", self: true }],
};

/** El módulo "self" (entidad ancla) de una lista. */
export function selfModule(lista: ListaKey): ModuloKey {
  return (FILTERABLE_BY_LIST[lista].find((m) => m.self)?.key ?? lista) as ModuloKey;
}

/**
 * Devuelve el/los registro(s) sobre los que evaluar una condición de `moduloKey`
 * dentro de una fila de `lista`. Para self → la fila. Para relacionado →
 * `row._rel[relKey]` (siempre como array para unificar la evaluación).
 */
export function resolveModuleRecords(
  row: Record<string, unknown>,
  lista: ListaKey,
  moduloKey: ModuloKey,
): Record<string, unknown>[] {
  const mod = FILTERABLE_BY_LIST[lista].find((m) => m.key === moduloKey);
  if (!mod) return [];
  if (mod.self) return [row];
  const rel = (row._rel ?? {}) as Record<string, unknown>;
  const data = mod.relKey ? rel[mod.relKey] : null;
  if (data == null) return [];
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [data as Record<string, unknown>];
}
