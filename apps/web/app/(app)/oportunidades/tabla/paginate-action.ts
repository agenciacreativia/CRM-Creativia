"use server";

import { listOportunidades, type OportunidadListItem } from "@/lib/db/oportunidades";
import { etiquetasPorEntidad } from "@/lib/db/etiquetas";
import { getSessionUser } from "@/lib/auth";
import type { Etiqueta } from "@/lib/db/etiquetas";

/** Params del listado en string-only para serializarlos desde el cliente.
 *  Conservamos exactamente los mismos del searchParams del page. */
export type PaginateParams = {
  estado?: string;
  pipeline?: string;
  asignado?: string;
  cierre_desde?: string;
  cierre_hasta?: string;
  valor_min?: string;
  valor_max?: string;
  mine?: string;
};

export type PaginateResult = {
  rows: OportunidadListItem[];
  etiquetasMap: Record<string, Etiqueta[]>;
  hasMore: boolean;
};

const PAGE_SIZE = 100;

/**
 * Trae la siguiente página de oportunidades aplicando los mismos filtros del
 * server. Devuelve también el mapa de etiquetas de esa página (la tabla lo
 * usa para renderizar las pills). El filtro avanzado (rowMatches) NO se
 * aplica acá — si el usuario lo activa, la página server trae 2000 de una y
 * el infinite scroll no agrega más (no tendría sentido).
 */
export async function cargarMasOportunidadesAction(
  offset: number,
  params: PaginateParams,
): Promise<PaginateResult> {
  const user = await getSessionUser();
  const asignado = params.mine === "1" && user ? user.id : params.asignado;
  const valorMin = params.valor_min ? Number(params.valor_min) : undefined;
  const valorMax = params.valor_max ? Number(params.valor_max) : undefined;

  const rows = await listOportunidades({
    estado: params.estado,
    pipeline_id: params.pipeline,
    asignado_id: asignado,
    cierre_desde: params.cierre_desde,
    cierre_hasta: params.cierre_hasta,
    valor_min: Number.isFinite(valorMin as number) ? valorMin : undefined,
    valor_max: Number.isFinite(valorMax as number) ? valorMax : undefined,
    limit: PAGE_SIZE,
    offset,
  });
  const etiquetasMap = await etiquetasPorEntidad("oportunidad", rows.map((r) => r.id));
  return { rows, etiquetasMap, hasMore: rows.length === PAGE_SIZE };
}
