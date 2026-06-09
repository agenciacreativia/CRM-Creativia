"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { etiquetaClasses } from "@/lib/etiqueta-colors";
import type { Etiqueta } from "@/lib/db/etiquetas";
import type { OportunidadListItem } from "@/lib/db/oportunidades";
import { bulkReasignarAction, bulkEstadoAction, bulkEtiquetaAction, bulkEliminarAction } from "./bulk-actions";

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  activo: "info", ganado: "success", perdido: "danger", eliminado: "default",
};
function money(v: number | null, m: string) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m }).format(v);
}

export function OportunidadesTable({
  rows,
  etiquetasMap,
  usuarios,
  etiquetas,
  canEditar,
  canEliminar,
}: {
  rows: OportunidadListItem[];
  etiquetasMap: Record<string, Etiqueta[]>;
  usuarios: { id: string; nombre: string }[];
  etiquetas: Etiqueta[];
  canEditar: boolean;
  canEliminar: boolean;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allOnPage = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const ids = [...sel];

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSel(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Error");
      else { setSel(new Set()); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Bulk action bar */}
      {sel.size > 0 && (canEditar || canEliminar) && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-brand-primary/30 bg-blue-50 px-3 py-2 text-sm">
          <span className="font-medium text-brand-primary">{sel.size} seleccionada{sel.size === 1 ? "" : "s"}</span>
          <button onClick={() => setSel(new Set())} className="text-gray-400 hover:text-gray-700" title="Limpiar"><X className="h-4 w-4" /></button>
          <div className="mx-1 h-4 w-px bg-gray-300" />
          {canEditar && (
            <>
              <select
                defaultValue="" disabled={pending}
                onChange={(e) => { if (e.target.value) run(() => bulkReasignarAction(ids, e.target.value === "_none" ? null : e.target.value)); e.target.value = ""; }}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                aria-label="Asignar oportunidades seleccionadas a usuario"
              >
                <option value="">Asignar a…</option>
                <option value="_none">Sin asignar</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <select
                defaultValue="" disabled={pending}
                onChange={(e) => { if (e.target.value) run(() => bulkEstadoAction(ids, e.target.value as "activo" | "ganado" | "perdido")); e.target.value = ""; }}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                aria-label="Cambiar estado de oportunidades seleccionadas"
              >
                <option value="">Cambiar estado…</option>
                <option value="activo">Activo</option>
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </select>
              {etiquetas.length > 0 && (
                <select
                  defaultValue="" disabled={pending}
                  onChange={(e) => { if (e.target.value) run(() => bulkEtiquetaAction(ids, e.target.value)); e.target.value = ""; }}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                  aria-label="Agregar etiqueta a oportunidades seleccionadas"
                >
                  <option value="">Agregar etiqueta…</option>
                  {etiquetas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              )}
            </>
          )}
          {canEliminar && (
            <button
              onClick={() => { if (confirm(`¿Eliminar ${sel.size} oportunidad(es)?`)) run(() => bulkEliminarAction(ids)); }}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-status-danger hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="h-4 w-4" aria-label="Seleccionar todo" />
              </th>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Empresa</th>
              <th className="px-4 py-2 font-medium">Embudo / Etapa</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium text-right">Valor</th>
              <th className="px-4 py-2 font-medium">Asignado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">No hay oportunidades con esos filtros.</td></tr>
            )}
            {rows.map((o) => {
              const tags = etiquetasMap[o.id] ?? [];
              return (
                <tr key={o.id} className={`border-t border-gray-100 hover:bg-gray-50 ${sel.has(o.id) ? "bg-blue-50/40" : ""}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4" aria-label={`Seleccionar ${o.nombre}`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/oportunidades/${o.id}`} className="font-medium text-brand-primary hover:underline">{o.nombre}</Link>
                    {tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span key={t.id} className={`rounded-full border px-1.5 py-0 text-[10px] font-medium ${etiquetaClasses(t.color)}`}>{t.nombre}</span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/empresas/${o.empresa_id}`} className="text-brand-primary hover:underline">{o.empresa_nombre}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    <span className="text-xs">{o.pipeline_nombre} · </span><span>{o.etapa_nombre}</span>
                  </td>
                  <td className="px-4 py-2.5"><Badge variant={ESTADO_BADGE[o.estado] ?? "default"}>{o.estado}</Badge></td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{money(o.valor, o.moneda)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{o.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
