"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { HtmlEditor } from "@/components/ui/html-editor";
import type { Campania, CampaniaMetrics } from "@/lib/db/campanias";
import { crearCampaniaAction, eliminarCampaniaAction, enviarCampaniaAction } from "./actions";

export function CampaniasManager({ initial, metricas = {} }: { initial: Campania[]; metricas?: Record<string, CampaniaMetrics> }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onEnviar(id: string) {
    if (!confirm("¿Enviar esta campaña ahora? Se mandará a TODOS los destinatarios del segmento.")) return;
    setBusy(id); setError(null); setOkMsg(null);
    const res = await enviarCampaniaAction(id);
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Error");
    else { setOkMsg(`Campaña enviada: ${res.enviados} ok, ${res.errores} con error.`); router.refresh(); }
  }
  async function onEliminar(id: string) {
    if (!confirm("¿Eliminar la campaña?")) return;
    setError(null); setOkMsg(null);
    const res = await eliminarCampaniaAction(id);
    if (!res.ok) setError(res.error ?? "Error"); else router.refresh();
  }

  if (creating) return <Form onCancel={() => setCreating(false)} onDone={() => { setCreating(false); router.refresh(); }} />;

  return (
    <div className="space-y-3">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      {okMsg && <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-gray-800">{okMsg}</div>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Campañas a tus contactos: redactá una vez, segmentá, envío masivo con tracking.</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nueva campaña
        </Button>
      </div>

      {initial.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Sin campañas todavía.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {initial.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-brand-primary" />
                  {c.estado === "enviada" ? (
                    <Link href={`/campanias/${c.id}`} className="font-medium text-brand-primary hover:underline">
                      {c.nombre}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900">{c.nombre}</span>
                  )}
                  <Badge variant={c.estado === "enviada" ? "success" : c.estado === "cancelada" ? "default" : "info"}>{c.estado}</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {c.asunto}
                  {c.estado === "enviada" && (
                    <>
                      {" "}·{" "}
                      <span className={c.enviados === 0 ? "text-status-danger" : ""}>
                        {c.enviados} enviado(s)
                      </span>
                      {/* Si la mig 0040 ya corrió, mostramos cuántos contactos eran
                          el target original + cuántos fallaron — útil para
                          diagnosticar "0 enviados" vs "ningún destinatario". */}
                      {typeof c.destinatarios_total === "number" && c.destinatarios_total > 0 && (
                        <> de {c.destinatarios_total}</>
                      )}
                      {typeof c.errores === "number" && c.errores > 0 && (
                        <> · <span className="text-status-danger">{c.errores} con error</span></>
                      )}
                    </>
                  )}
                </p>
                {c.estado === "enviada" && c.error_resumen && (
                  <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-status-danger" title="Último error registrado durante el envío">
                    ⚠ {c.error_resumen}
                  </p>
                )}
                {c.estado === "enviada" && metricas[c.id] && (
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-gray-600">
                    <span title="Tasa de apertura">📨 Aperturas: <strong>{metricas[c.id].tasa_apertura ?? "—"}%</strong> ({metricas[c.id].abiertos_unicos})</span>
                    <span title="Tasa de click">🖱 Clicks: <strong>{metricas[c.id].tasa_click ?? "—"}%</strong> ({metricas[c.id].click_unicos})</span>
                    <span title="Bounces (rebotes)">↩ Bounces: <strong>{metricas[c.id].bounces}</strong></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {c.estado === "borrador" && (
                  <button type="button" onClick={() => onEnviar(c.id)} disabled={busy === c.id} className="inline-flex items-center gap-1 rounded border border-brand-primary bg-brand-primary px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" /> {busy === c.id ? "Enviando…" : "Enviar"}
                  </button>
                )}
                <button type="button" onClick={() => onEliminar(c.id)} aria-label={`Eliminar campaña ${c.nombre}`} title="Eliminar campaña" className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Form({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [nombre, setNombre] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [estado, setEstado] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null); setSaving(true);
    const res = await crearCampaniaAction({ nombre, asunto, cuerpo_html: cuerpo, estado_empresa: estado });
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Error");
    onDone();
  }

  return (
    <form
      method="POST"
      action="#"
      onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); guardar(); }}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-5"
    >
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre interno"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Promo invierno" /></Field>
        <Field label="Segmento (estado empresa)">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los contactos</option>
            <option value="prospecto">Solo prospectos</option>
            <option value="cliente">Solo clientes</option>
            <option value="inactivo">Solo inactivos</option>
          </Select>
        </Field>
      </div>
      <Field label="Asunto"><Input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="¡Promo exclusiva!" /></Field>
      <Field label="Cuerpo del correo">
        <HtmlEditor value={cuerpo} onChange={setCuerpo} placeholder="<p>Hola {{nombre}}, te queremos contar…</p>" rows={12} />
        <p className="mt-1 text-[11px] text-gray-400">Variables disponibles: <code>{"{{nombre}}"}</code>, <code>{"{{empresa}}"}</code>, <code>{"{{email}}"}</code>.</p>
      </Field>
      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear campaña"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
