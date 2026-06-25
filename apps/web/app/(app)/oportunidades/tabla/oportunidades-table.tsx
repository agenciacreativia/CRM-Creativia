"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { etiquetaClasses } from "@/lib/etiqueta-colors";
import type { Etiqueta } from "@/lib/db/etiquetas";
import type { OportunidadListItem } from "@/lib/db/oportunidades";
import { OPP_COLUMNS } from "./columns";
import { BulkRowCheckbox, BulkSelectAllCheckbox } from "@/components/bulk/selection-store";
import { cargarMasOportunidadesAction, type PaginateParams } from "./paginate-action";

export function OportunidadesTable({
  rows: initialRows,
  etiquetasMap: initialEtiquetasMap,
  visibleCols,
  paginate,
}: {
  rows: OportunidadListItem[];
  etiquetasMap: Record<string, Etiqueta[]>;
  visibleCols: string[];
  /** Si está presente, el infinite scroll dispara y trae más páginas con
   *  estos params (sólo se setea cuando NO hay filtro avanzado client-side,
   *  porque la paginación servidor no sabe aplicar rowMatches). */
  paginate?: { initialCount: number; hasMore: boolean; params: PaginateParams };
}) {
  const cols = OPP_COLUMNS.filter((c) => visibleCols.includes(c.key));
  const colCount = cols.length + 1; // +1 por la columna de checkbox

  const [rows, setRows] = useState(initialRows);
  const [etiquetasMap, setEtiquetasMap] = useState(initialEtiquetasMap);
  const [hasMore, setHasMore] = useState(paginate?.hasMore ?? false);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  // Cuando el server side cambia (filtros, orden), re-sync.
  useEffect(() => {
    setRows(initialRows);
    setEtiquetasMap(initialEtiquetasMap);
    setHasMore(paginate?.hasMore ?? false);
  }, [initialRows, initialEtiquetasMap, paginate?.hasMore]);

  // IntersectionObserver: cuando el sentinel entra en viewport, pedimos la
  // siguiente página. Sólo se monta si la paginación está habilitada.
  useEffect(() => {
    if (!paginate || !hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loading) return;
        setLoading(true);
        startTransition(async () => {
          const res = await cargarMasOportunidadesAction(rows.length, paginate.params);
          setRows((prev) => {
            const known = new Set(prev.map((r) => r.id));
            return [...prev, ...res.rows.filter((r) => !known.has(r.id))];
          });
          setEtiquetasMap((prev) => ({ ...prev, ...res.etiquetasMap }));
          setHasMore(res.hasMore);
          setLoading(false);
        });
      },
      { rootMargin: "400px" }, // empezamos a pedir cuando faltan ~400px para llegar al final
    );
    io.observe(el);
    return () => io.disconnect();
  }, [paginate, hasMore, loading, rows.length]);

  const pageIds = rows.map((r) => r.id);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="w-10 px-3 py-2">
              <BulkSelectAllCheckbox scope="oportunidades" ids={pageIds} />
            </th>
            {cols.map((c) => (
              <th key={c.key} className={`px-4 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={colCount} className="py-8 text-center text-gray-500">No hay oportunidades con esos filtros.</td></tr>
          )}
          {rows.map((o, i) => {
            const tags = etiquetasMap[o.id] ?? [];
            return (
              <tr
                key={o.id}
                style={{ "--row-index": i } as React.CSSProperties}
                className="tr-fade-in border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-3 py-2.5">
                  <BulkRowCheckbox id={o.id} scope="oportunidades" />
                </td>
                {cols.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.render(o)}
                    {/* Las etiquetas cuelgan de la columna Nombre. */}
                    {c.key === "nombre" && tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span key={t.id} className={`rounded-full border px-1.5 py-0 text-[11px] font-medium ${etiquetaClasses(t.color)}`}>{t.nombre}</span>
                        ))}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          {paginate && (hasMore || loading) && (
            <tr ref={sentinelRef}>
              <td colSpan={colCount} className="py-4 text-center text-xs text-gray-400">
                {loading ? "Cargando más…" : "↓"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
