"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { ProductoMayorista } from "@/lib/db/catalogo-mayorista";
import { guardarCatalogoAction, eliminarCatalogoAction } from "./actions";

const MONEDAS = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"];
const CATEGORIAS = ["Paquete", "Vuelo", "Hotel", "Crucero", "Tour", "Traslado", "Asistencia", "Otro"];

function money(v: number | null, m: string) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export function CatalogoManager({ initial }: { initial: ProductoMayorista[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductoMayorista | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este producto del catálogo?")) return;
    const res = await eliminarCatalogoAction(id);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  if (creating || editing) {
    return <Form editing={editing} onDone={() => { setCreating(false); setEditing(null); router.refresh(); }} onCancel={() => { setCreating(false); setEditing(null); }} />;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{initial.length} productos en el catálogo</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Destino</th>
              <th className="px-4 py-2 font-medium text-right">Precio neto</th>
              <th className="px-4 py-2 font-medium">Salida / Cupo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-500">Catálogo vacío.</td></tr>}
            {initial.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{p.nombre}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.categoria ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.destino ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{money(p.precio_neto, p.moneda)}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {p.fecha_salida ?? "sin fecha"}{p.cupo != null ? ` · ${p.cupo} cupos` : ""}
                </td>
                <td className="px-4 py-2.5"><Badge variant={p.activo ? "success" : "default"}>{p.activo ? "activo" : "inactivo"}</Badge></td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditing(p)} className="text-gray-400 hover:text-brand-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(p.id)} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
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

function Form({ editing, onDone, onCancel }: { editing: ProductoMayorista | null; onDone: () => void; onCancel: () => void }) {
  const p = editing;
  const [f, setF] = useState({
    nombre: p?.nombre ?? "", categoria: p?.categoria ?? "", destino: p?.destino ?? "", duracion: p?.duracion ?? "",
    proveedor: p?.proveedor ?? "", descripcion: p?.descripcion ?? "", incluye: p?.incluye ?? "", no_incluye: p?.no_incluye ?? "",
    precio_neto: p?.precio_neto != null ? String(p.precio_neto) : "", moneda: p?.moneda ?? "USD",
    cupo: p?.cupo != null ? String(p.cupo) : "", fecha_salida: p?.fecha_salida ?? "", activo: p ? p.activo : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setError(null);
    if (!f.nombre.trim()) return setError("El nombre es obligatorio.");
    setSaving(true);
    const res = await guardarCatalogoAction(editing?.id ?? null, {
      nombre: f.nombre, categoria: f.categoria || null, destino: f.destino || null, duracion: f.duracion || null,
      proveedor: f.proveedor || null, descripcion: f.descripcion || null, incluye: f.incluye || null, no_incluye: f.no_incluye || null,
      precio_neto: f.precio_neto ? Number(f.precio_neto) : null, moneda: f.moneda,
      cupo: f.cupo ? Number(f.cupo) : null, fecha_salida: f.fecha_salida || null, activo: f.activo,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onDone();
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-bold uppercase text-gray-500">{editing ? "Editar producto" : "Nuevo producto del catálogo"}</h2>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre"><Input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Europa Clásica 12 días" /></Field>
        <Field label="Categoría"><Select value={f.categoria} onChange={(e) => set("categoria", e.target.value)}><option value="">—</option>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label="Destino"><Input value={f.destino} onChange={(e) => set("destino", e.target.value)} /></Field>
        <Field label="Duración"><Input value={f.duracion} onChange={(e) => set("duracion", e.target.value)} placeholder="12 días / 11 noches" /></Field>
        <Field label="Operador / Aerolínea"><Input value={f.proveedor} onChange={(e) => set("proveedor", e.target.value)} /></Field>
        <Field label="Precio neto (mayorista)">
          <div className="flex gap-2">
            <Input type="number" step="0.01" value={f.precio_neto} onChange={(e) => set("precio_neto", e.target.value)} />
            <Select value={f.moneda} onChange={(e) => set("moneda", e.target.value)} className="w-24">{MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}</Select>
          </div>
        </Field>
        <Field label="Fecha de salida (opcional)"><Input type="date" value={f.fecha_salida} onChange={(e) => set("fecha_salida", e.target.value)} /></Field>
        <Field label="Cupo (opcional)"><Input type="number" min="0" value={f.cupo} onChange={(e) => set("cupo", e.target.value)} /></Field>
      </div>
      <Field label="Descripción"><Textarea rows={2} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></Field>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Incluye"><Textarea rows={2} value={f.incluye} onChange={(e) => set("incluye", e.target.value)} /></Field>
        <Field label="No incluye"><Textarea rows={2} value={f.no_incluye} onChange={(e) => set("no_incluye", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={f.activo} onChange={(e) => set("activo", e.target.checked)} className="h-4 w-4" /> Activo (visible para las agencias)
      </label>
      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
