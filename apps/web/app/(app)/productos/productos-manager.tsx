"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Producto } from "@/lib/db/productos";
import { saveProductoAction } from "./actions";
import { ItinerarioMiniEditor } from "@/components/producto/itinerario-mini-editor";
import {
  bulkActivarProductosAction,
  bulkCambiarCategoriaProductosAction,
  bulkEliminarProductosAction,
} from "@/components/bulk/bulk-productos-actions";

const MONEDAS = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"];
const PRODUCTO_CATEGORIAS = ["Paquete", "Vuelo", "Hotel", "Crucero", "Tour", "Traslado", "Asistencia", "Otro"];

function fmtPrice(v: number | null, m: string) {
  if (v == null) return "—";
  return new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export function ProductosManager({
  initial,
  canCrear = true,
  canEditar = true,
  canEliminar = true,
}: {
  initial: Producto[];
  canCrear?: boolean;
  canEditar?: boolean;
  canEliminar?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Producto | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"propios" | "turistea">("propios");
  const [search, setSearch] = useState("");
  // Bulk selection: solo aplicable a la pestaña "propios" (los del catálogo
  // Turistea son read-only desde acá).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }
  async function runBulk<T>(label: string, fn: () => Promise<T & { ok: boolean; error?: string; afectados?: number }>) {
    setBulkBusy(true);
    setError(null);
    const res = await fn();
    setBulkBusy(false);
    if (!res.ok) {
      setError(res.error ?? `Error en ${label}`);
      return;
    }
    clearSelection();
    router.refresh();
  }
  const propios = initial.filter((p) => p.origen === "propio");
  const turistea = initial.filter((p) => p.origen === "turistea");
  const base = tab === "propios" ? propios : turistea;
  const visible = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((row) =>
      row.nombre.toLowerCase().includes(q) ||
      (row.categoria ?? "").toLowerCase().includes(q) ||
      (row.destino ?? "").toLowerCase().includes(q),
    );
  })();

  const showForm = creating || editing !== null;
  const p = editing;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await saveProductoAction(editing?.id ?? null, fd);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    setCreating(false);
    setEditing(null);
    router.refresh();
  }

  // onDelete por fila se removió en el lote UX (botón papelera por row eliminado).
  // El borrado ahora pasa por el detalle del producto o por bulk delete.

  if (showForm) {
    return (
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500">
          {editing ? "Editar producto" : "Nuevo producto"}
        </h2>
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre" htmlFor="nombre" required>
            <Input id="nombre" name="nombre" defaultValue={p?.nombre ?? ""} placeholder="Ej. Europa Clásica 12 días" required />
          </Field>
          <Field label="Categoría" htmlFor="categoria">
            <Select id="categoria" name="categoria" defaultValue={p?.categoria ?? ""}>
              <option value="">—</option>
              {PRODUCTO_CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Destino" htmlFor="destino">
            <Input id="destino" name="destino" defaultValue={p?.destino ?? ""} placeholder="Ej. Europa" />
          </Field>
          <Field label="Duración" htmlFor="duracion">
            <Input id="duracion" name="duracion" defaultValue={p?.duracion ?? ""} placeholder="Ej. 12 días / 11 noches" />
          </Field>
          <Field label="Precio desde" htmlFor="precio_desde">
            <Input id="precio_desde" name="precio_desde" type="number" step="0.01" defaultValue={p?.precio_desde ?? ""} />
          </Field>
          <Field label="Moneda" htmlFor="moneda">
            <Select id="moneda" name="moneda" defaultValue={p?.moneda ?? "USD"}>
              {MONEDAS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Proveedor / Operador" htmlFor="proveedor">
            <Input id="proveedor" name="proveedor" defaultValue={p?.proveedor ?? ""} />
          </Field>
        </div>

        <Field label="Descripción" htmlFor="descripcion">
          <Textarea id="descripcion" name="descripcion" rows={3} defaultValue={p?.descripcion ?? ""} />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Incluye" htmlFor="incluye">
            <Textarea id="incluye" name="incluye" rows={3} defaultValue={p?.incluye ?? ""} placeholder="Vuelos, hotel, traslados…" />
          </Field>
          <Field label="No incluye" htmlFor="no_incluye">
            <Textarea id="no_incluye" name="no_incluye" rows={3} defaultValue={p?.no_incluye ?? ""} placeholder="Propinas, gastos personales…" />
          </Field>
        </div>

        <ItinerarioMiniEditor initial={p?.itinerario ?? []} />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="activo" value="true" defaultChecked={p ? p.activo : true} className="rounded" />
          Activo (disponible para vender)
        </label>

        <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
          <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</Button>
          <Button type="button" variant="ghost" onClick={() => { setCreating(false); setEditing(null); setError(null); }}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="inline-flex w-full rounded-md border border-gray-200 bg-white p-0.5 sm:w-auto">
          <button
            type="button"
            onClick={() => setTab("propios")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium sm:flex-none ${tab === "propios" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Mis productos <span className="ml-1 text-xs opacity-70">({propios.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("turistea")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium sm:flex-none ${tab === "turistea" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Catálogo <span className="ml-1 text-xs opacity-70">({turistea.length})</span>
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          placeholder="Buscar producto…"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder-gray-400 focus:border-brand-navy focus:outline-none sm:w-56"
        />
        <div className="flex items-center justify-between gap-2 sm:ml-auto">
          <p className="text-sm text-gray-500">{visible.length}</p>
          {canCrear && tab === "propios" && (
            <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          )}
          {tab === "turistea" && (
            <Link href="/catalogo" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              Ir al catálogo
            </Link>
          )}
        </div>
      </div>

      <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              {canEditar && tab === "propios" && <th className="w-8 px-2 py-3" aria-label="Selección" />}
              <th className="px-4 py-3 font-bold">Nombre</th>
              <th className="px-4 py-3 font-bold">Categoría</th>
              <th className="px-4 py-3 font-bold">Destino</th>
              <th className="px-4 py-3 font-bold text-right">Desde</th>
              <th className="px-4 py-3 font-bold">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={canEditar && tab === "propios" ? 7 : 6} className="py-8 text-center text-gray-500">
                {tab === "propios" ? "Aún no tenés productos propios. Crealos con + Nuevo producto o copialos del catálogo." : "Aún no cargaste productos del catálogo Turistea."}
              </td></tr>
            )}
            {visible.map((row, idx) => (
              <tr key={row.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${idx % 2 ? "bg-blue-50/30" : ""}`}>
                {canEditar && tab === "propios" && (
                  <td className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                      aria-label={`Seleccionar ${row.nombre}`}
                    />
                  </td>
                )}
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  <Link href={`/productos/${row.id}`} className="text-brand-navy hover:underline">{row.nombre}</Link>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{row.categoria ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{row.destino ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{fmtPrice(row.precio_desde, row.moneda)}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={row.activo ? "success" : "default"}>{row.activo ? "activo" : "inactivo"}</Badge>
                </td>
                {/* Lote UX: quitamos lápiz + papelera por fila. La edición se hace
                    clickeando el nombre del producto (link a /productos/[id])
                    y desde ahí se accede a editar/eliminar. Para acciones
                    masivas (incluida la eliminación), la barra inferior. */}
                <td className="px-4 py-2.5 text-right">
                  {row.origen !== "propio" && <span className="text-xs italic text-gray-400">Turistea</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE: cards apiladas */}
      <div className="md:hidden space-y-2">
        {visible.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            {tab === "propios" ? "Aún no tenés productos propios. Crealos con + Nuevo producto." : "Aún no cargaste productos del catálogo Turistea."}
          </div>
        )}
        {visible.map((row) => (
          <div key={row.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50">
            {canEditar && tab === "propios" && (
              <input
                type="checkbox"
                checked={selectedIds.has(row.id)}
                onChange={() => toggleSelected(row.id)}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded"
                aria-label={`Seleccionar ${row.nombre}`}
              />
            )}
            <Link href={`/productos/${row.id}`} className="flex flex-1 min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-gray-900">{row.nombre}</span>
                <Badge variant={row.activo ? "success" : "default"}>{row.activo ? "activo" : "inactivo"}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                {row.categoria && <span>{row.categoria}</span>}
                {row.destino && <span>📍 {row.destino}</span>}
                <span className="font-medium text-gray-700">{fmtPrice(row.precio_desde, row.moneda)}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Barra inferior de acciones masivas — solo en tab "propios" con permiso.
          En mobile: full-width al pie. En sm+: isla flotante centrada. */}
      {canEditar && tab === "propios" && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 sm:bottom-4 sm:flex sm:justify-center sm:px-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white px-3 py-2 shadow-lg sm:gap-3 sm:rounded-lg sm:border sm:px-4">
            <span className="text-sm font-medium text-gray-700">
              <strong>{selectedIds.size}</strong> seleccionado(s)
            </span>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulk("activar", () => bulkActivarProductosAction([...selectedIds], true))}
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {bulkBusy ? "Procesando…" : "Activar"}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => runBulk("desactivar", () => bulkActivarProductosAction([...selectedIds], false))}
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Desactivar
            </button>
            <select
              defaultValue=""
              disabled={bulkBusy}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                runBulk("cambiar categoría", () =>
                  bulkCambiarCategoriaProductosAction([...selectedIds], v === "__null__" ? null : v),
                );
                e.target.value = "";
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              <option value="">Categoría…</option>
              <option value="__null__">(sin categoría)</option>
              {PRODUCTO_CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {canEliminar && (
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => {
                  if (!confirm(`¿Eliminar ${selectedIds.size} producto(s)? No se podrá deshacer.`)) return;
                  runBulk("eliminar", () => bulkEliminarProductosAction([...selectedIds]));
                }}
                className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-status-danger hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Limpiar selección"
              title="Limpiar selección"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
