"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Key, Plus, Trash2, Webhook, Copy, Check, Calendar, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { ApiKey } from "@/lib/db/api-keys";
import { EVENTOS_WEBHOOK, type EventoWebhook, type Webhook as Wh } from "@/lib/webhooks-types";
import type { ReporteProgramado } from "@/lib/db/reportes-programados";
import {
  crearApiKeyAction, revocarApiKeyAction,
  crearWebhookAction, toggleWebhookAction, eliminarWebhookAction,
  crearReporteProgramadoAction, eliminarReporteProgramadoAction,
} from "./actions";

export function IntegracionesManager({
  apiKeys,
  webhooks,
  reportes,
}: {
  apiKeys: ApiKey[];
  webhooks: Wh[];
  reportes: ReporteProgramado[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* 2FA */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><Shield className="h-4 w-4" /> Autenticación 2FA</h2>
        <p className="text-xs text-gray-500">
          La verificación en dos pasos (TOTP) se administra desde Supabase Auth → MFA. Cuando lo actives, cada admin va a poder enrolar su app autenticadora.
        </p>
      </section>

      {/* API keys */}
      <ApiKeysCard apiKeys={apiKeys} onError={setError} onChange={() => router.refresh()} />

      {/* Webhooks */}
      <WebhooksCard webhooks={webhooks} onError={setError} onChange={() => router.refresh()} />

      {/* Reportes programados */}
      <ReportesProgramadosCard reportes={reportes} onError={setError} onChange={() => router.refresh()} />
    </div>
  );
}

function ApiKeysCard({ apiKeys, onError, onChange }: { apiKeys: ApiKey[]; onError: (e: string) => void; onChange: () => void }) {
  const [nombre, setNombre] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function crear() {
    if (!nombre.trim()) return;
    setCreating(true);
    try {
      const res = await crearApiKeyAction(nombre);
      if (!res.ok || !res.key) onError(res.error ?? "Error");
      else { setRevealed(res.key); setNombre(""); onChange(); }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }
  async function revocar(id: string) {
    if (!confirm("¿Revocar esta API key?")) return;
    const res = await revocarApiKeyAction(id);
    if (!res.ok) onError(res.error ?? "Error"); else onChange();
  }
  function copy() {
    if (!revealed) return;
    navigator.clipboard?.writeText(revealed).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><Key className="h-4 w-4" /> API key</h2>
        <a href="/ajustes/integraciones/docs" className="text-xs font-semibold text-brand-primary hover:underline">Ver documentación →</a>
      </header>
      <p className="mb-3 text-xs text-gray-500">Endpoints v1: <code className="rounded bg-gray-100 px-1.5 py-0.5">/api/v1/contactos</code> · <code className="rounded bg-gray-100 px-1.5 py-0.5">/api/v1/empresas</code> · <code className="rounded bg-gray-100 px-1.5 py-0.5">/api/v1/oportunidades</code> · <code className="rounded bg-gray-100 px-1.5 py-0.5">/api/v1/productos</code>. Una sola key activa por cuenta. Si superás el límite mensual, los leads van a lista de espera.</p>

      {revealed && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">¡Guardá esta key ahora! No la volverás a ver.</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 truncate rounded border border-amber-300 bg-white px-2 py-1 text-xs">{revealed}</code>
            <button onClick={copy} className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs hover:bg-amber-100">
              {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
            </button>
            <button onClick={() => setRevealed(null)} className="text-xs text-amber-700 hover:underline">Cerrar</button>
          </div>
        </div>
      )}

      {apiKeys.some((k) => !k.revocada) ? (
        <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">Ya tenés una API key activa. Para generar otra, revocá la actual primero.</p>
      ) : (
        <div className="flex gap-2">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. Web pública, Zapier, n8n)" />
          <Button type="button" size="md" variant="success" onClick={crear} disabled={creating || !nombre.trim()} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> {creating ? "Creando…" : "Crear API key"}
          </Button>
        </div>
      )}

      <ul className="mt-3 divide-y divide-gray-100">
        {apiKeys.length === 0 && <li className="py-3 text-center text-xs text-gray-400">Sin keys.</li>}
        {apiKeys.map((k) => {
          const pct = k.limite_mes ? Math.min(100, Math.round((k.usados_mes / k.limite_mes) * 100)) : 0;
          return (
            <li key={k.id} className="py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{k.nombre} {k.revocada && <Badge variant="danger">revocada</Badge>}</p>
                  <p className="text-xs text-gray-500">{k.prefijo}…{k.ultimo_uso ? ` · usada ${new Date(k.ultimo_uso).toLocaleDateString("es")}` : ""}</p>
                </div>
                {!k.revocada && <button onClick={() => revocar(k.id)} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>}
              </div>
              {!k.revocada && k.limite_mes != null && (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Uso del mes</span>
                    <span>{k.usados_mes.toLocaleString("es")} / {k.limite_mes.toLocaleString("es")}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full ${pct >= 100 ? "bg-status-danger" : pct >= 80 ? "bg-amber-500" : "bg-brand-navy"}`} style={{ width: `${pct}%` }} />
                  </div>
                  {pct >= 100 && <p className="mt-1 text-[11px] text-status-danger">Límite excedido — los leads entrantes irán a la lista de espera.</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WebhooksCard({ webhooks, onError, onChange }: { webhooks: Wh[]; onError: (e: string) => void; onChange: () => void }) {
  const [creating, setCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [eventos, setEventos] = useState<EventoWebhook[]>([]);

  function toggleEv(ev: EventoWebhook) {
    setEventos((arr) => (arr.includes(ev) ? arr.filter((x) => x !== ev) : [...arr, ev]));
  }
  async function crear() {
    if (!nombre.trim() || !url.trim() || eventos.length === 0) return onError("Completá nombre, URL y al menos un evento.");
    setCreating(true);
    try {
      const res = await crearWebhookAction({ nombre, url, eventos, secret });
      if (!res.ok) onError(res.error ?? "Error");
      else { setNombre(""); setUrl(""); setSecret(""); setEventos([]); onChange(); }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><Webhook className="h-4 w-4" /> Webhooks salientes</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Make / n8n / Zapier" /></Field>
        <Field label="URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hook.tu-tool.com/..." /></Field>
        <Field label="Secret (opcional)"><Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="firma HMAC" /></Field>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Eventos</label>
          <div className="flex flex-wrap gap-1.5">
            {EVENTOS_WEBHOOK.map((ev) => (
              <label key={ev} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs">
                <input type="checkbox" checked={eventos.includes(ev)} onChange={() => toggleEv(ev)} className="h-3 w-3" />
                {ev}
              </label>
            ))}
          </div>
        </div>
      </div>
      <Button type="button" size="sm" onClick={crear} disabled={creating} className="mt-3"><Plus className="h-4 w-4" /> Crear webhook</Button>

      <ul className="mt-4 divide-y divide-gray-100">
        {webhooks.length === 0 && <li className="py-3 text-center text-xs text-gray-400">Sin webhooks.</li>}
        {webhooks.map((w) => (
          <li key={w.id} className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{w.nombre} <Badge variant={w.activo ? "success" : "default"}>{w.activo ? "activo" : "off"}</Badge></p>
              <p className="truncate text-xs text-gray-500">{w.url} · {w.eventos.length} evento(s){w.ultimo_envio ? ` · último ${new Date(w.ultimo_envio).toLocaleDateString("es")} [${w.ultimo_estado ?? "?"}]` : ""}</p>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={w.activo}
                  onChange={async (e) => {
                    const res = await toggleWebhookAction(w.id, e.target.checked);
                    if (!res.ok) onError(res.error ?? "Error"); else onChange();
                  }}
                  className="mr-1 h-3.5 w-3.5"
                />activar
              </label>
              <button onClick={async () => {
                if (!confirm("¿Eliminar webhook?")) return;
                const res = await eliminarWebhookAction(w.id);
                if (!res.ok) onError(res.error ?? "Error"); else onChange();
              }} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReportesProgramadosCard({ reportes, onError, onChange }: { reportes: ReporteProgramado[]; onError: (e: string) => void; onChange: () => void }) {
  const [nombre, setNombre] = useState("");
  const [dest, setDest] = useState("");
  const [freq, setFreq] = useState<"diario" | "semanal" | "mensual">("semanal");
  const [busy, setBusy] = useState(false);

  async function crear() {
    if (!nombre.trim() || !dest.trim()) return onError("Completá nombre y destinatarios.");
    // Validar emails antes de mandar al server (split por coma/punto-y-coma/espacio).
    const emails = dest.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const invalidos = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalidos.length) return onError(`Emails inválidos: ${invalidos.join(", ")}`);
    if (emails.length === 0) return onError("Pegá al menos un email destinatario.");
    setBusy(true);
    try {
      const res = await crearReporteProgramadoAction({ nombre, destinatarios: dest, frecuencia: freq, activo: true });
      if (!res.ok) onError(res.error ?? "Error");
      else { setNombre(""); setDest(""); onChange(); }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><Calendar className="h-4 w-4" /> Reportes programados</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Resumen semanal" /></Field>
        <Field label="Destinatarios (coma)"><Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="ana@ag.com, jefe@ag.com" /></Field>
        <Field label="Frecuencia">
          <Select value={freq} onChange={(e) => setFreq(e.target.value as "diario")}>
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </Select>
        </Field>
        <div className="flex items-end"><Button type="button" size="sm" onClick={crear} disabled={busy}><Plus className="h-4 w-4" /> Crear</Button></div>
      </div>

      <ul className="mt-3 divide-y divide-gray-100">
        {reportes.length === 0 && <li className="py-3 text-center text-xs text-gray-400">Sin reportes programados.</li>}
        {reportes.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{r.nombre} <Badge variant={r.activo ? "info" : "default"}>{r.frecuencia}</Badge></p>
              <p className="text-xs text-gray-500">{r.destinatarios.join(", ")}{r.proximo_envio ? ` · próximo ${new Date(r.proximo_envio).toLocaleDateString("es")}` : ""}</p>
            </div>
            <button onClick={async () => {
              if (!confirm("¿Eliminar?")) return;
              const res = await eliminarReporteProgramadoAction(r.id);
              if (!res.ok) onError(res.error ?? "Error"); else onChange();
            }} className="text-gray-400 hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-gray-400">Para el envío recurrente real, el cron de la plataforma corre cada hora y manda los que estén vencidos (próximo paso: cron job).</p>
    </section>
  );
}
