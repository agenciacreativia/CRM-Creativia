"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Printer, FileText, Plane, Send, FileDown, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Producto } from "@/lib/db/productos";
import {
  type Cotizacion,
  type CotizacionItem,
  type ItinerarioDia,
  cotizacionSubtotal,
  cotizacionTotal,
  cotizacionMargen,
  itemSubtotal,
  fmtMoney,
} from "@/lib/cotizacion/types";
import { saveCotizacionAction, deleteCotizacionAction, enviarCotizacionAction } from "./cotizacion-actions";
import { ItinerarioEditor } from "./itinerario-editor";
import { CotizacionBloqueoForm, type PlanLite, type ContactoPrefill, type AcomodacionPrefill } from "./cotizacion-bloqueo-form";

const MONEDAS = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"];
const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  borrador: "default",
  enviada: "info",
  aceptada: "success",
  confirmada: "success",
  rechazada: "danger",
};

const emptyItem: CotizacionItem = { producto_id: null, nombre: "", descripcion: null, cantidad: 1, precio_unitario: 0, costo_unitario: 0 };

export function CotizacionBuilder({
  oportunidadId,
  productos,
  initial,
  defaultMoneda,
  planes = [],
  prefill,
  acomodaciones,
}: {
  oportunidadId: string;
  productos: Producto[];
  initial: Cotizacion[];
  defaultMoneda: string;
  planes?: PlanLite[];
  prefill?: ContactoPrefill;
  /** Habitaciones+pasajeros ya cargados en la oportunidad. Pre-llena el form
   *  de cotización desde bloqueo si están presentes. */
  acomodaciones?: AcomodacionPrefill[] | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Cotizacion | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingBloqueo, setCreatingBloqueo] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Envío al cliente (PDF por email).
  const [sendFor, setSendFor] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ id: string; type: "ok" | "err"; text: string } | null>(null);

  function openSend(id: string) {
    setSendFor(id);
    setSendEmail(prefill?.email_agente ?? "");
    setSendMsg(null);
  }
  async function doSend(id: string) {
    setSending(true);
    const res = await enviarCotizacionAction(id, oportunidadId, sendEmail);
    setSending(false);
    if (res.ok) {
      setSendFor(null);
      setSendMsg({ id, type: "ok", text: `Enviada a ${sendEmail}` });
      router.refresh();
    } else {
      setSendMsg({ id, type: "err", text: res.error ?? "No se pudo enviar" });
    }
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta cotización?")) return;
    startTransition(async () => {
      const res = await deleteCotizacionAction(id, oportunidadId);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  if (creatingBloqueo) {
    return (
      <CotizacionBloqueoForm
        oportunidadId={oportunidadId}
        planes={planes}
        prefill={prefill ?? { nombre_agente: "", email_agente: "", telefono_agente: null, agencia_nombre: null }}
        prefillAcomodaciones={acomodaciones}
        onDone={() => {
          setCreatingBloqueo(false);
          router.refresh();
        }}
        onCancel={() => setCreatingBloqueo(false)}
      />
    );
  }

  if (creating || editing) {
    return (
      <CotizacionForm
        oportunidadId={oportunidadId}
        productos={productos}
        defaultMoneda={defaultMoneda}
        editing={editing}
        onDone={() => {
          setCreating(false);
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase text-gray-500">Cotizaciones</h2>
        <div className="flex items-center gap-2">
          {planes.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreatingBloqueo(true)} className="inline-flex items-center gap-1.5">
              <Plane className="h-4 w-4" /> Desde plan Turistea
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nueva cotización
          </Button>
        </div>
      </div>

      {initial.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No hay cotizaciones todavía.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {initial.map((c) => (
            <li key={c.id} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{c.titulo}</p>
                <p className="text-xs text-gray-500">
                  {c.items.length} ítems · {fmtMoney(cotizacionTotal(c.items, c.descuento), c.moneda)}
                  {c.confirmada_en ? <span className="ml-1 inline-flex items-center gap-0.5 text-green-700"><CheckCircle2 className="h-3 w-3" /> confirmada</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ESTADO_BADGE[c.estado] ?? "default"}>{c.estado}</Badge>
                <a href={`/cotizaciones/${c.id}/pdf`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-primary" title="PDF">
                  <FileDown className="h-4 w-4" />
                </a>
                <button onClick={() => openSend(c.id)} className="text-gray-400 hover:text-brand-primary" title="Enviar al cliente">
                  <Send className="h-4 w-4" />
                </button>
                <Link href={`/cotizaciones/${c.id}`} target="_blank" className="text-gray-400 hover:text-brand-primary" title="Ver / Imprimir">
                  <Printer className="h-4 w-4" />
                </Link>
                <button onClick={() => setEditing(c)} className="text-gray-400 hover:text-brand-primary" title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => onDelete(c.id)} className="text-gray-400 hover:text-status-danger" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {sendFor === c.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2">
                <input
                  type="email"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                  placeholder="email@cliente.com"
                  className="h-9 min-w-[220px] flex-1 rounded-md border border-gray-300 px-2 text-sm"
                />
                <Button type="button" size="sm" onClick={() => doSend(c.id)} disabled={sending} className="inline-flex items-center gap-1.5">
                  <Send className="h-4 w-4" /> {sending ? "Enviando…" : "Enviar PDF"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSendFor(null)} disabled={sending}>Cancelar</Button>
              </div>
            )}
            {sendMsg?.id === c.id && (
              <p className={`mt-1 text-xs ${sendMsg.type === "ok" ? "text-green-700" : "text-status-danger"}`}>{sendMsg.text}</p>
            )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CotizacionForm({
  oportunidadId,
  productos,
  defaultMoneda,
  editing,
  onDone,
  onCancel,
}: {
  oportunidadId: string;
  productos: Producto[];
  defaultMoneda: string;
  editing: Cotizacion | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState(editing?.titulo ?? "Cotización de viaje");
  const [moneda, setMoneda] = useState(editing?.moneda ?? defaultMoneda ?? "USD");
  const [validez, setValidez] = useState(editing?.validez_dias ?? 15);
  const [descuento, setDescuento] = useState(editing?.descuento ?? 0);
  const [estado, setEstado] = useState<Cotizacion["estado"]>(editing?.estado ?? "borrador");
  const [notas, setNotas] = useState(editing?.notas ?? "");
  const [items, setItems] = useState<CotizacionItem[]>(editing?.items.length ? editing.items : [{ ...emptyItem }]);
  const [itinerario, setItinerario] = useState<ItinerarioDia[]>(editing?.itinerario ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(i: number, patch: Partial<CotizacionItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addItem() {
    setItems((arr) => [...arr, { ...emptyItem }]);
  }
  function addProducto(i: number, productoId: string) {
    const p = productos.find((x) => x.id === productoId);
    if (!p) return;
    updateItem(i, {
      producto_id: p.id,
      nombre: p.nombre,
      descripcion: p.destino ? `${p.destino}${p.duracion ? " · " + p.duracion : ""}` : null,
      precio_unitario: p.precio_desde ?? 0,
    });
  }

  async function save() {
    setError(null);
    const valid = items.filter((it) => it.nombre.trim());
    if (valid.length === 0) {
      setError("Agregá al menos un ítem con nombre.");
      return;
    }
    setSaving(true);
    const res = await saveCotizacionAction({
      id: editing?.id ?? null,
      oportunidad_id: oportunidadId,
      titulo,
      moneda: moneda as "USD" | "ARS" | "EUR" | "MXN" | "COP" | "CLP" | "PEN" | "BRL",
      descuento: Number(descuento) || 0,
      notas: notas || null,
      validez_dias: Number(validez) || 15,
      estado,
      items: valid.map((it) => ({
        producto_id: it.producto_id,
        nombre: it.nombre,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad) || 0,
        precio_unitario: Number(it.precio_unitario) || 0,
        costo_unitario: Number(it.costo_unitario) || 0,
      })),
      itinerario,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    onDone();
  }

  const subtotal = cotizacionSubtotal(items);
  const total = cotizacionTotal(items, descuento);
  const { margen, pct: margenPct } = cotizacionMargen(items, descuento);

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Field label="Título"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
        </div>
        <Field label="Moneda">
          <Select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={estado} onChange={(e) => setEstado(e.target.value as Cotizacion["estado"])}>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
          </Select>
        </Field>
      </div>

      {/* Items */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium w-20 text-right">Cant.</th>
              <th className="px-3 py-2 font-medium w-28 text-right">Costo</th>
              <th className="px-3 py-2 font-medium w-28 text-right">Precio</th>
              <th className="px-3 py-2 font-medium w-32 text-right">Subtotal</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2">
                  {productos.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) addProducto(i, e.target.value); e.target.value = ""; }}
                      className="mb-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                    >
                      <option value="">+ Desde producto…</option>
                      {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  )}
                  <Input value={it.nombre} onChange={(e) => updateItem(i, { nombre: e.target.value })} placeholder="Concepto" />
                  <input
                    value={it.descripcion ?? ""}
                    onChange={(e) => updateItem(i, { descripcion: e.target.value || null })}
                    placeholder="Detalle (opcional)"
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Input type="number" min="0" value={it.cantidad} onChange={(e) => updateItem(i, { cantidad: Number(e.target.value) })} className="text-right" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Input type="number" min="0" step="0.01" value={it.costo_unitario ?? 0} onChange={(e) => updateItem(i, { costo_unitario: Number(e.target.value) })} className="text-right" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Input type="number" min="0" step="0.01" value={it.precio_unitario} onChange={(e) => updateItem(i, { precio_unitario: Number(e.target.value) })} className="text-right" />
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{fmtMoney(itemSubtotal(it), moneda)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={addItem} className="inline-flex items-center gap-1.5">
        <Plus className="h-4 w-4" /> Agregar ítem
      </Button>

      {/* Itinerario día por día */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold uppercase text-gray-500">Itinerario</h3>
        <ItinerarioEditor itinerario={itinerario} onChange={setItinerario} />
      </div>

      {/* Totals + meta */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Validez (días)"><Input type="number" min="0" value={validez} onChange={(e) => setValidez(Number(e.target.value))} /></Field>
          <Field label="Notas"><Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Condiciones, formas de pago…" /></Field>
        </div>
        <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtMoney(subtotal, moneda)}</span></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Descuento</span>
            <input type="number" min="0" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
            <span>Total</span><span>{fmtMoney(total, moneda)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-gray-500">Margen{margenPct != null ? ` (${margenPct}%)` : ""}</span>
            <span className={margen >= 0 ? "font-medium text-green-700" : "font-medium text-status-danger"}>{fmtMoney(margen, moneda)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cotización"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
