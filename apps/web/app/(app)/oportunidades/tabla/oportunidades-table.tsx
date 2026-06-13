"use client";

import { etiquetaClasses } from "@/lib/etiqueta-colors";
import type { Etiqueta } from "@/lib/db/etiquetas";
import type { OportunidadListItem } from "@/lib/db/oportunidades";
import { OPP_COLUMNS } from "./columns";
import { BulkRowCheckbox, BulkSelectAllCheckbox } from "@/components/bulk/selection-store";

export function OportunidadesTable({
  rows,
  etiquetasMap,
  visibleCols,
}: {
  rows: OportunidadListItem[];
  etiquetasMap: Record<string, Etiqueta[]>;
  visibleCols: string[];
}) {
  // Columnas a renderizar, en el orden del catálogo, filtradas por la selección.
  const cols = OPP_COLUMNS.filter((c) => visibleCols.includes(c.key));
  const colCount = cols.length + 1; // +1 por la columna de checkbox
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
          {rows.map((o) => {
            const tags = etiquetasMap[o.id] ?? [];
            return (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
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
        </tbody>
      </table>
    </div>
  );
}
