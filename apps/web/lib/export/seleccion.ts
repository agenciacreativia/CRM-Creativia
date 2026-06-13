import "server-only";
import { listEmpresas } from "@/lib/db/empresas";
import { listContactos } from "@/lib/db/contactos";
import { listOportunidades } from "@/lib/db/oportunidades";
import { listProductos } from "@/lib/db/productos";
import {
  EMPRESA_EXPORT_COLS,
  CONTACTO_EXPORT_COLS,
  OPORTUNIDAD_EXPORT_COLS,
  PRODUCTO_EXPORT_COLS,
  projectRow,
  type ModuloExport,
} from "./columns";

export type { ModuloExport };

/**
 * Carga las filas de `modulo` con `ids` (filtradas por tenant vía RLS) y las
 * devuelve como objetos planos listos para CSV/XLSX, proyectando SOLO las
 * columnas `cols` (las visibles en la tabla). Reusa los mismos list items que
 * renderiza la tabla para garantizar paridad columna↔export. El orden de las
 * claves es el orden de las columnas.
 */
export async function cargarParaExportar(
  modulo: ModuloExport,
  ids: string[],
  cols?: string[],
): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];

  if (modulo === "empresas") {
    const rows = await listEmpresas({ ids });
    return rows.map((r) => projectRow(r, EMPRESA_EXPORT_COLS, cols));
  }
  if (modulo === "contactos") {
    const rows = await listContactos({ ids });
    return rows.map((r) => projectRow(r, CONTACTO_EXPORT_COLS, cols));
  }
  if (modulo === "oportunidades") {
    const rows = await listOportunidades({ ids });
    return rows.map((r) => projectRow(r, OPORTUNIDAD_EXPORT_COLS, cols));
  }
  // productos — listProductos no filtra por ids; lo hacemos en memoria.
  const idSet = new Set(ids);
  const rows = (await listProductos()).filter((p) => idSet.has(p.id));
  return rows.map((r) => projectRow(r, PRODUCTO_EXPORT_COLS, cols));
}
