"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Package, ArrowRightCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/cotizacion/types";
import type { Producto } from "@/lib/db/productos";
import type { OportunidadProducto } from "@/lib/db/oportunidad-productos";
import {
  addOportunidadProductoAction,
  updateOportunidadProductoAction,
  removeOportunidadProductoAction,
  setOportunidadValorAction,
} from "./oportunidad-productos-actions";

function lineSubtotal(p: { cantidad: number; precio_unitario: number }): number {
  return (Number(p.cantidad) || 0) * (Number(p.precio_unitario) || 0);
}

export function OportunidadProductos({
  oportunidadId,
  productos,
  initial,
  defaultMoneda,
  oportunidadValor,
  canEdit,
}: {
  oportunidadId: string;
  productos: Producto[];
  initial: OportunidadProducto[];
  defaultMoneda: string;
  oportunidadValor: number | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<OportunidadProducto[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? productos.filter((p) =>
        [p.nombre, p.destino, p.categoria].some((f) => f?.toLowerCase().includes(q)),
      )
    : productos;

  const moneda = rows[0]?.moneda ?? defaultMoneda ?? "USD";
  const total = rows.reduce((s, r) => s + lineSubtotal(r), 0);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function addFromCatalog(productoId: string) {
    setError(null);
    const isCustom = productoId === "__custom__";
    const p = isCustom ? null : productos.find((x) => x.id === productoId);
    if (!isCustom && !p) return;

    const monedasValidas = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"] as const;
    type MonedaValida = (typeof monedasValidas)[number];
    const candidateMon = (p?.moneda || defaultMoneda) as string;
    const monedaSafe: MonedaValida = (monedasValidas as readonly string[]).includes(candidateMon)
      ? (candidateMon as MonedaValida)
      : "USD";
    const nuevo = {
      producto_id: p?.id ?? null,
      nombre: p?.nombre ?? "Concepto",
      cantidad: 1,
      precio_unitario: p?.precio_desde ?? 0,
      moneda: monedaSafe,
    };

    const res = await addOportunidadProductoAction({ oportunidad_id: oportunidadId, ...nuevo });
    if (!res.ok || !res.id) return setError(res.error ?? "Error");
    setRows((arr) => [...arr, { id: res.id as string, ...nuevo }]);
    setPickerOpen(false);
    setQuery("");
    refresh();
  }

  function patchLocal(id: string, patch: Partial<OportunidadProducto>) {
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function commit(id: string, patch: { nombre?: string; cantidad?: number; precio_unitario?: number }) {
    const res = await updateOportunidadProductoAction(id, oportunidadId, patch);
    if (!res.ok) setError(res.error ?? "Error");
  }

  async function remove(id: string) {
    setRows((arr) => arr.filter((r) => r.id !== id));
    const res = await removeOportunidadProductoAction(id, oportunidadId);
    if (!res.ok) {
      setError(res.error ?? "Error");
      refresh();
    }
  }

  async function useAsValue() {
    if (!Number.isFinite(total) || total <= 0) {
      setError("El total debe ser un número mayor a 0 antes de usarlo como valor.");
      return;
    }
    const res = await setOportunidadValorAction(oportunidadId, total);
    if (!res.ok) setError(res.error ?? "Error");
    else refresh();
  }

  return (
    <div className="space-y-3">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
          <Package className="h-4 w-4" /> Productos del negocio
        </h2>
        {canEdit && productos.length > 0 && (
          <div className="relative" ref={pickerRef}>
            <Button
              type="button"
              size="sm"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Agregar producto
            </Button>

            {pickerOpen && (
              <div className="absolute right-0 z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg surface-white">
                <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-gray-400" />
                  {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, destino o categoría…"
                    className="w-full border-0 p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                  />
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-3 text-center text-sm text-gray-400">Sin coincidencias</li>
                  ) : (
                    filtered.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addFromCatalog(p.id)}
                          className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-gray-900">{p.nombre}</span>
                            {(p.destino || p.categoria) && (
                              <span className="block truncate text-xs text-gray-400">
                                {[p.categoria, p.destino].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </span>
                          {p.precio_desde != null && (
                            <span className="shrink-0 text-xs font-medium text-gray-500">
                              {fmtMoney(p.precio_desde, p.moneda)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => addFromCatalog("__custom__")}
                  className="flex w-full items-center gap-1.5 border-t border-gray-100 px-3 py-2 text-left text-sm text-brand-primary hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" /> Concepto libre
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No hay productos en esta oportunidad.
          {canEdit && productos.length === 0 && " Creá productos en el módulo Productos primero."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="w-20 px-3 py-2 text-right font-medium">Cant.</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Precio</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">Subtotal</th>
                  {canEdit && <th className="w-8 px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      {canEdit ? (
                        <Input
                          value={r.nombre}
                          onChange={(e) => patchLocal(r.id, { nombre: e.target.value })}
                          onBlur={(e) => commit(r.id, { nombre: e.target.value })}
                        />
                      ) : (
                        <span className="text-gray-900">{r.nombre}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canEdit ? (
                        <Input
                          type="number"
                          min="0"
                          value={r.cantidad}
                          onChange={(e) => { const n = Number(e.target.value); patchLocal(r.id, { cantidad: Number.isFinite(n) && n >= 0 ? n : 0 }); }}
                          onBlur={(e) => { const n = Number(e.target.value); commit(r.id, { cantidad: Number.isFinite(n) && n >= 0 ? n : 0 }); }}
                          className="text-right"
                        />
                      ) : (
                        r.cantidad
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canEdit ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.precio_unitario}
                          onChange={(e) => { const n = Number(e.target.value); patchLocal(r.id, { precio_unitario: Number.isFinite(n) && n >= 0 ? n : 0 }); }}
                          onBlur={(e) => { const n = Number(e.target.value); commit(r.id, { precio_unitario: Number.isFinite(n) && n >= 0 ? n : 0 }); }}
                          className="text-right"
                        />
                      ) : (
                        fmtMoney(r.precio_unitario, r.moneda)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {fmtMoney(lineSubtotal(r), r.moneda)}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-status-danger" title="Quitar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-base font-bold text-gray-900">
              Total: {fmtMoney(total, moneda)}
            </div>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={useAsValue}
                className="inline-flex items-center gap-1.5"
                title="Reemplaza el valor de la oportunidad con este total"
              >
                <ArrowRightCircle className="h-4 w-4" />
                Usar como valor del negocio
                {oportunidadValor != null && (
                  <span className="text-xs text-gray-400">(actual: {fmtMoney(oportunidadValor, moneda)})</span>
                )}
              </Button>
            )}
          </div>
        </>
      )}

      {canEdit && productos.length === 0 && rows.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => addFromCatalog("__custom__")}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Agregar concepto
        </Button>
      )}
    </div>
  );
}
