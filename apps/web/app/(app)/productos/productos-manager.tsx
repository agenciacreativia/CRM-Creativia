"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Columns3, X, MapPin } from "lucide-react";
import { BulkActionsInline } from "@/components/bulk/bulk-actions-inline";
import { BulkRowCheckbox, BulkSelectAllCheckbox, clearBulk } from "@/components/bulk/selection-store";
import type { FilterField } from "@/lib/filters/types";
import { PRODUCTO_COLUMNS, PRODUCTO_DEFAULT_COLS } from "./tabla/columns";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Producto } from "@/lib/db/productos";
import { saveProductoAction } from "./actions";
import { ItinerarioMiniEditor } from "@/components/producto/itinerario-mini-editor";

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
  editFields = [],
}: {
  initial: Producto[];
  canCrear?: boolean;
  canEditar?: boolean;
  canEliminar?: boolean;
  editFields?: FilterField[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Producto | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"propios" | "turistea">("propios");
  const [search, setSearch] = useState("");
  // Columnas visibles (estado local; productos no usa ?cols= porque ya es un island client).
  const [visibleCols, setVisibleCols] = useState<string[]>(PRODUCTO_DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const cols = PRODUCTO_COLUMNS.filter((c) => visibleCols.includes(c.key));

  function toggleCol(key: string) {
    setVisibleCols((prev) => {
      const set = new Set(prev);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      if (!set.has("nombre")) set.add("nombre");
      return PRODUCTO_COLUMNS.filter((c) => set.has(c.key)).map((c) => c.key);
    });
  }

  // La selección masiva vive en el store por eventos (scope "productos"), igual
  // que el resto de listas. Al cambiar de pestaña limpiamos para no arrastrar
  // selección entre "propios" y "catálogo".
  function switchTab(t: "propios" | "turistea") {
    clearBulk("productos");
    setTab(t);
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
        {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

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
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Toolbar estándar: izquierda = tabs + buscar + crear; derecha =
          contador + columnas. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 rounded-md border border-gray-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => switchTab("propios")}
              className={`inline-flex h-full items-center rounded px-3 text-sm font-medium ${tab === "propios" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Mis productos <span className="ml-1 text-xs opacity-70">({propios.length})</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("turistea")}
              className={`inline-flex h-full items-center rounded px-3 text-sm font-medium ${tab === "turistea" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Catálogo <span className="ml-1 text-xs opacity-70">({turistea.length})</span>
            </button>
          </div>
          <input
            type="search"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Buscar producto…"
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm placeholder-gray-400 focus:border-brand-navy focus:outline-none sm:w-56"
          />
          {canCrear && tab === "propios" && (
            <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex h-9 items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          )}
          {tab === "turistea" && (
            <Link href="/catalogo" className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50">
              Ir al catálogo
            </Link>
          )}
          {canEditar && tab === "propios" && (
            <BulkActionsInline
              modulo="productos"
              scope="productos"
              editFields={editFields}
              cols={visibleCols}
              allIds={visible.map((p) => p.id)}
              canEliminar={canEliminar}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="whitespace-nowrap text-xs text-gray-500">{visible.length} resultados</p>
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setColsOpen((o) => !o)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Columns3 className="h-4 w-4" /> Columnas
            </button>
            {colsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setColsOpen(false)} aria-hidden />
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Columnas visibles</span>
                    <button type="button" onClick={() => setColsOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="max-h-72 space-y-0.5 overflow-y-auto">
                    {PRODUCTO_COLUMNS.map((c) => (
                      <label key={c.key} className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${c.fixed ? "text-gray-400" : "cursor-pointer text-gray-700 hover:bg-gray-50"}`}>
                        <input type="checkbox" checked={visibleCols.includes(c.key)} disabled={c.fixed} onChange={() => toggleCol(c.key)} className="rounded" />
                        {c.label}
                        {c.fixed && <span className="ml-auto text-[11px] uppercase text-gray-300">fija</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              {canEditar && tab === "propios" && (
                <th className="w-8 px-2 py-3"><BulkSelectAllCheckbox scope="productos" ids={visible.map((p) => p.id)} /></th>
              )}
              {cols.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-bold ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={cols.length + 1 + (canEditar && tab === "propios" ? 1 : 0)} className="py-8 text-center text-gray-500">
                {tab === "propios" ? "Aún no tenés productos propios. Crealos con + Nuevo producto o copialos del catálogo." : "Aún no cargaste productos del catálogo Turistea."}
              </td></tr>
            )}
            {visible.map((row) => (
              <tr key={row.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50`}>
                {canEditar && tab === "propios" && (
                  <td className="px-2 py-2.5 text-center">
                    <BulkRowCheckbox id={row.id} scope="productos" />
                  </td>
                )}
                {cols.map((c) => (
                  <td key={c.key} className={`px-4 py-2.5 ${c.align === "right" ? "text-right" : ""}`}>{c.render(row)}</td>
                ))}
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
              <div className="shrink-0">
                <BulkRowCheckbox id={row.id} scope="productos" />
              </div>
            )}
            <Link href={`/productos/${row.id}`} className="flex flex-1 min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-gray-900">{row.nombre}</span>
                <Badge variant={row.activo ? "success" : "default"}>{row.activo ? "activo" : "inactivo"}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                {row.categoria && <span>{row.categoria}</span>}
                {row.destino && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {row.destino}</span>}
                <span className="font-medium text-gray-700">{fmtPrice(row.precio_desde, row.moneda)}</span>
              </div>
            </Link>
          </div>
        ))}
      </div>

    </div>
  );
}
