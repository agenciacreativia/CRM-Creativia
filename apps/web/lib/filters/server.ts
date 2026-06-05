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
