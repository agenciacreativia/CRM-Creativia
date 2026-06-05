"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Producto } from "@/lib/db/productos";
import { saveProductoAction, deleteProductoAction } from "./actions";

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
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"propios" | "turistea">("propios");
  const propios = initial.filter((p) => p.origen === "propio");
  const turistea = initial.filter((p) => p.origen === "turistea");
  const visible = tab === "propios" ? propios : turistea;

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

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    startTransition(async () => {
      const res = await deleteProductoAction(id);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setTab("propios")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === "propios" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Mis productos <span className="ml-1 text-xs opacity-70">({propios.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("turistea")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${tab === "turistea" ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Catálogo Turistea <span className="ml-1 text-xs opacity-70">({turistea.length})</span>
          </button>
        </div>
        <p className="text-sm text-gray-500">{visible.length} {tab === "propios" ? "propios" : "del catálogo"}</p>
        {canCrear && tab === "propios" && (
          <Button type="button" size="sm" onClick={() => setCreating(true)} className="ml-auto inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
        )}
        {tab === "turistea" && (
          <Link href="/catalogo" className="ml-auto rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Ir al catálogo Turistea
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
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
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">
                {tab === "propios" ? "Aún no tenés productos propios. Crealos con + Nuevo producto o copialos del catálogo." : "Aún no cargaste productos del catálogo Turistea."}
              </td></tr>
            )}
            {visible.map((row, idx) => (
              <tr key={row.id} className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${idx % 2 ? "bg-blue-50/30" : ""}`}>
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  <Link href={`/productos/${row.id}`} className="text-brand-navy hover:underline">{row.nombre}</Link>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{row.categoria ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{row.destino ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{fmtPrice(row.precio_desde, row.moneda)}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={row.activo ? "success" : "default"}>{row.activo ? "activo" : "inactivo"}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canEditar && row.origen === "propio" && (
                      <button data-edit-id={row.id} onClick={() => setEditing(row)} className="text-gray-400 hover:text-brand-primary" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {canEliminar && (
                      <button onClick={() => onDelete(row.id)} className="text-gray-400 hover:text-status-danger" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {row.origen !== "propio" && <span className="text-xs italic text-gray-400">Turistea</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
