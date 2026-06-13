import "server-only";
import { listCampos, type TipoEntidad } from "@/lib/db/campos";
import { FIXED_FIELDS, customTipoToFilterType } from "./catalogs";
import type { FilterField } from "./types";

/**
 * Builds the full filter field catalog for an entity: built-in columns plus the
 * tenant's custom fields (from campo_personalizado). Safe to pass to the client
 * FilterBuilder.
 */
export async function getFilterFields(entidad: TipoEntidad): Promise<FilterField[]> {
  const custom = await listCampos(entidad);
  const customFields: FilterField[] = custom.map((c) => ({
    key: c.clave,
    label: c.etiqueta,
    type: customTipoToFilterType(c.tipo),
    options: c.opciones ? c.opciones.map((o) => ({ value: o, label: o })) : undefined,
    custom: true,
  }));
  return [...FIXED_FIELDS[entidad], ...customFields];
}

import { FILTERABLE_BY_LIST, type ListaKey, type ModuloKey } from "./relations";
import { listUsuarios } from "@/lib/db/usuarios";
import { listPipelines } from "@/lib/db/pipelines";
import { listEtapasParaReglas } from "@/lib/db/automatizaciones";

// Campos cuyas opciones de "seleccion" se cargan dinámicamente del tenant.
const DYNAMIC_OPTIONS: Record<string, "usuarios" | "pipelines" | "etapas"> = {
  asignado_id: "usuarios",
  pipeline_id: "pipelines",
  etapa_id: "etapas",
  etapa_anterior_id: "etapas",
};

/** Inyecta opciones reales (usuarios, embudos, etapas) en los campos que las usan. */
async function injectDynamicOptions(fields: FilterField[]): Promise<FilterField[]> {
  const needs = new Set(fields.map((f) => DYNAMIC_OPTIONS[f.key]).filter(Boolean));
  if (needs.size === 0) return fields;
  const [usuarios, pipelines, etapas] = await Promise.all([
    needs.has("usuarios") ? listUsuarios({ activo: "activos" }).catch(() => []) : Promise.resolve([]),
    needs.has("pipelines") ? listPipelines().catch(() => []) : Promise.resolve([]),
    needs.has("etapas") ? listEtapasParaReglas().catch(() => []) : Promise.resolve([]),
  ]);
  const opts = {
    usuarios: usuarios.map((u) => ({ value: u.id, label: u.nombre })),
    pipelines: pipelines.map((p) => ({ value: p.id, label: p.nombre })),
    // Etapas con el embudo entre paréntesis: hay etapas homónimas en distintos embudos.
    etapas: etapas.map((e) => ({ value: e.id, label: `${e.nombre} (${e.pipeline_nombre})` })),
  };
  return fields.map((f) => {
    const src = DYNAMIC_OPTIONS[f.key];
    return src ? { ...f, type: "seleccion" as const, options: opts[src] } : f;
  });
}

/** Campos (fijos + custom) de un módulo. Producto no tiene campos custom. */
async function getModuleFields(modulo: ModuloKey): Promise<FilterField[]> {
  const base = modulo === "producto" ? FIXED_FIELDS.producto : await getFilterFields(modulo);
  return injectDynamicOptions(base);
}

export type ListFilterModule = {
  key: ModuloKey;
  label: string;
  isMany?: boolean;
  fields: FilterField[];
};

/**
 * Config de filtros para una LISTA: los módulos que se pueden filtrar desde
 * ella (la entidad ancla + sus relacionadas) con los campos de cada uno.
 * Alimenta tanto el FilterBuilder (UI) como el motor (rowMatches).
 */
export async function getListFilterConfig(lista: ListaKey): Promise<ListFilterModule[]> {
  const mods = FILTERABLE_BY_LIST[lista];
  return Promise.all(
    mods.map(async (m) => ({
      key: m.key,
      label: m.label,
      isMany: m.isMany,
      fields: await getModuleFields(m.key),
    })),
  );
}

/** Mapa moduloKey → campos, para pasar a rowMatches. */
export function fieldsByModule(modules: ListFilterModule[]): Record<string, FilterField[]> {
  return Object.fromEntries(modules.map((m) => [m.key, m.fields]));
}
