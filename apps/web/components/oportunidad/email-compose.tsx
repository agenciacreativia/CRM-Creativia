"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { RichText } from "@/components/ui/rich-text";
import { sendOportunidadEmailAction } from "@/lib/actions/email";
import type { PlantillaCorreo } from "@/lib/db/plantillas";
import type { Producto } from "@/lib/db/productos";
import type { Documento } from "@/lib/db/documentos";
import { applyMerge, type MergeVars, type MergeField } from "@/lib/email/merge";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function productoToHtml(p: Producto): string {
  const price =
    p.precio_desde != null
      ? new Intl.NumberFormat("es", { style: "currency", currency: p.moneda, maximumFractionDigits: 0 }).format(p.precio_desde)
      : "";
  let h = `<p><strong>${esc(p.nombre)}</strong></p>`;
  const meta = [p.destino, p.duracion].filter(Boolean).map((x) => esc(x as string)).join(" · ");
  if (meta) h += `<p>${meta}</p>`;
  if (price) h += `<p>Desde <strong>${price}</strong></p>`;
  if (p.incluye) h += `<p><strong>Incluye:</strong> ${esc(p.incluye)}</p>`;
  if (p.no_incluye) h += `<p><strong>No incluye:</strong> ${esc(p.no_incluye)}</p>`;
  return h;
}

export function EmailCompose({
  oportunidadId,
  defaultTo,
  googleConnected,
  fromEmail,
  plantillas,
  mergeVars,
  mergeFields,
  productos,
  documentos,
}: {
  oportunidadId: string;
  defaultTo: string;
  googleConnected: boolean;
  fromEmail: string | null;
  plantillas: PlantillaCorreo[];
  mergeVars: MergeVars;
  mergeFields: MergeField[];
  productos: Producto[];
  documentos: Documento[];
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [seed, setSeed] = useState(0); // remounts the editor when a template loads
  const [adjuntos, setAdjuntos] = useState<string[]>([]);

  if (!googleConnected) {
    return (
      <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
        Para enviar correos desde el CRM, conectá tu Gmail en{" "}
        <Link href="/ajustes" className="font-medium text-brand-primary hover:underline">Ajustes</Link>.
      </div>
    );
  }

  const [showVars, setShowVars] = useState(false);

  function applyTemplate(id: string) {
    const t = plantillas.find((p) => p.id === id);
    if (!t) return;
    setSubject(applyMerge(t.asunto, mergeVars, false));
    setBodyHtml(applyMerge(t.cuerpo_html, mergeVars, true));
    setSeed((s) => s + 1);
  }

  function insertProducto(id: string) {
    const p = productos.find((x) => x.id === id);
    if (!p) return;
    setBodyHtml((prev) => prev + productoToHtml(p));
    setSeed((s) => s + 1);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("oportunidad_id", oportunidadId);
    fd.set("adjuntos", adjuntos.join(","));
    const res = await sendOportunidadEmailAction(fd);
    setSending(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo enviar");
      return;
    }
    form.reset();
    setSubject("");
    setBodyHtml("");
    setAdjuntos([]);
    setSeed((s) => s + 1);
    setSent(true);
    router.refresh();
  }

  function toggleAdjunto(id: string) {
    setAdjuntos((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <form onSubmit={onSubmit} className="mb-5 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Enviando desde <span className="font-medium text-gray-700">{fromEmail ?? "tu Gmail"}</span>
        </p>
        <div className="flex items-center gap-2">
          {productos.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) insertProducto(e.target.value);
                e.target.value = "";
              }}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="">Insertar producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
          {plantillas.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applyTemplate(e.target.value);
                e.target.value = "";
              }}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
            >
              <option value="">Usar plantilla…</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="text-xs">
        <button
          type="button"
          onClick={() => setShowVars((v) => !v)}
          className="text-brand-primary hover:underline"
        >
          {showVars ? "Ocultar" : "Ver"} variables disponibles ({mergeFields.length})
        </button>
        {showVars && (
          <div className="mt-2 flex flex-wrap gap-1.5 rounded-md border border-gray-200 bg-white p-2">
            {mergeFields.map((f) => (
              <span
                key={f.token}
                title={f.label}
                className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600"
              >
                {f.token}
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-gray-400">
          Escribí estas etiquetas en el asunto o cuerpo y se reemplazan con los datos de la oportunidad al enviar.
        </p>
      </div>

      <Field label="Para" htmlFor="to">
        <Input id="to" name="to" type="email" defaultValue={defaultTo} required />
      </Field>
      <Field label="Asunto" htmlFor="subject">
        <Input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </Field>
      <Field label="Mensaje" htmlFor="body">
        <RichText key={seed} name="body" defaultHtml={bodyHtml} onChange={setBodyHtml} />
      </Field>

      {documentos.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Adjuntar documentos</p>
          <div className="flex flex-wrap gap-2">
            {documentos.map((d) => {
              const on = adjuntos.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleAdjunto(d.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    on ? "border-brand-primary bg-[rgba(39,34,85,0.06)] text-brand-primary" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  📎 {d.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-status-danger">{error}</p>}
      {sent && <p className="text-sm text-[var(--green-tag)]">Correo enviado ✓</p>}

      <Button type="submit" disabled={sending} className="inline-flex items-center gap-2">
        <Send className="h-4 w-4" />
        {sending ? "Enviando…" : "Enviar correo"}
      </Button>

      {plantillas.length === 0 && (
        <p className="text-xs text-gray-400">
          Tip: creá plantillas reutilizables en{" "}
          <Link href="/ajustes" className="text-brand-primary hover:underline">Ajustes</Link>.
        </p>
      )}
    </form>
  );
}
