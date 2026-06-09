"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Copy, Check, ExternalLink, X, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Agencia } from "@/lib/db/agencias";
import { crearAgenciaAction, updateAgenciaAction, verComoAgenciaAction } from "./actions";

type PlanOpt = { id: string; nombre: string };
type Creada = { loginUrl: string; adminEmail: string; tempPassword: string; subdominio: string };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });
}
function trialInfo(iso: string | null): { label: string; vencido: boolean } | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  const dias = Math.ceil((end - Date.now()) / 86_400_000);
  return dias < 0 ? { label: "trial vencido", vencido: true } : { label: `trial: ${dias} días`, vencido: false };
}

export function AgenciasManager({ initial, planes }: { initial: Agencia[]; planes: PlanOpt[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<Creada | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Buscamos "lite" como inicio del nombre para tolerar variantes ("Lite", "Lite QA", "Lite Starter").
  const litePlan = planes.find((p) => p.nombre.trim().toLowerCase().startsWith("lite")) ?? planes[0];

  const [verBusy, setVerBusy] = useState<string | null>(null);
  async function verComo(id: string) {
    setError(null);
    setVerBusy(id);
    const res = await verComoAgenciaAction(id);
    setVerBusy(null);
    if (!res.ok || !res.url) { setError(res.error ?? "Error"); return; }
    // Defensa anti redirect malicioso: validamos que la URL devuelta tenga
    // protocol http(s) y host del dominio raíz esperado.
    try {
      const u = new URL(res.url);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme inválido");
      window.location.href = u.toString();
    } catch {
      setError("La URL de handoff devuelta no es válida.");
    }
  }

  async function changeAgencia(id: string, patch: { plan_id?: string; estado?: Agencia["estado"]; nit?: string | null }) {
    setError(null);
    setSavingId(id);
    const res = await updateAgenciaAction(id, patch);
    setSavingId(null);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  if (creating) {
    return (
      <NuevaAgencia
        planes={planes}
        defaultPlanId={litePlan?.id ?? ""}
        onCancel={() => setCreating(false)}
        onCreated={(c) => {
          setCreating(false);
          setCreada(c);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {creada && <CredencialesPanel creada={creada} onClose={() => setCreada(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{initial.length} agencias</p>
        <Button type="button" size="sm" onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Nueva agencia
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Agencia</th>
              <th className="px-4 py-2 font-medium">NIT Turistea</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Trial</th>
              <th className="px-4 py-2 font-medium text-right">Usuarios</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">Todavía no hay agencias. Creá la primera.</td></tr>
            )}
            {initial.map((a) => {
              const trial = trialInfo(a.trial_termina_en);
              return (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{a.nombre_empresa}</div>
                    <div className="text-xs text-gray-400">{a.subdominio} · {fmtDate(a.creado_en)}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      // Re-mount on prop change para que el defaultValue refleje cambios desde otros tabs / refreshes.
                      key={`nit-${a.id}-${a.nit ?? ""}`}
                      type="text"
                      defaultValue={a.nit ?? ""}
                      placeholder="NIT"
                      disabled={savingId === a.id}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v !== (a.nit ?? "")) changeAgencia(a.id, { nit: v || null }); }}
                      className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                      title="NIT con el que la agencia figura en tu base de Turistea (para enviar reservas)"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={a.plan_id ?? ""}
                      onChange={(e) => changeAgencia(a.id, { plan_id: e.target.value })}
                      disabled={savingId === a.id}
                      className="w-36"
                    >
                      {!a.plan_id && <option value="">— Sin plan —</option>}
                      {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={a.estado}
                      onChange={(e) => changeAgencia(a.id, { estado: e.target.value as Agencia["estado"] })}
                      disabled={savingId === a.id}
                      className="w-36"
                    >
                      <option value="activo">Activo</option>
                      <option value="suspendido">Suspendido</option>
                      <option value="cancelado">Cancelado</option>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">
                    {trial ? (
                      <Badge variant={trial.vencido ? "danger" : "default"}>{trial.label}</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{a.usuarios_count}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => verComo(a.id)}
                      disabled={verBusy === a.id}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      title="Entrar al CRM de esta agencia en modo soporte"
                    >
                      <Eye className="h-3.5 w-3.5" /> {verBusy === a.id ? "Entrando…" : "Ver como"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Cambiar el plan de una agencia libera automáticamente los registros en lista de espera (si el nuevo plan tiene topes más altos).
      </p>
    </div>
  );
}

function NuevaAgencia({
  planes,
  defaultPlanId,
  onCancel,
  onCreated,
}: {
  planes: PlanOpt[];
  defaultPlanId: string;
  onCancel: () => void;
  onCreated: (c: Creada) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [subdominio, setSubdominio] = useState("");
  const [adminNombre, setAdminNombre] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [nit, setNit] = useState("");
  const [planId, setPlanId] = useState(defaultPlanId);
  const [trialMeses, setTrialMeses] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function slug(v: string) {
    return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await crearAgenciaAction({
      nombre_empresa: nombre,
      subdominio,
      admin_nombre: adminNombre,
      admin_email: adminEmail,
      nit: nit || null,
      plan_id: planId,
      trial_meses: trialMeses,
    });
    setSaving(false);
    if (!res.ok || !res.creada) { setError(res.error ?? "Error"); return; }
    onCreated(res.creada);
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
        <Building2 className="h-4 w-4" /> Nueva agencia
      </h2>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre de la agencia">
          <Input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); if (!subdominio) setSubdominio(slug(e.target.value)); }}
            placeholder="Ej: Viajes del Sol"
          />
        </Field>
        <Field label="Subdominio">
          <div className="flex items-center gap-1">
            <Input value={subdominio} onChange={(e) => setSubdominio(slug(e.target.value))} placeholder="viajesdelsol" />
            <span className="whitespace-nowrap text-xs text-gray-400">.turistea.app</span>
          </div>
        </Field>
        <Field label="Nombre del administrador">
          <Input value={adminNombre} onChange={(e) => setAdminNombre(e.target.value)} placeholder="Nombre y apellido" />
        </Field>
        <Field label="Correo del administrador">
          <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@agencia.com" />
        </Field>
        <Field label="NIT en Turistea (para reservas)">
          <Input value={nit} onChange={(e) => setNit(e.target.value)} placeholder="Ej: 29121874" />
        </Field>
        <Field label="Plan inicial">
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Prueba gratuita">
          <Select value={String(trialMeses)} onChange={(e) => setTrialMeses(Number(e.target.value))}>
            <option value="0">Sin trial</option>
            <option value="1">1 mes</option>
            <option value="2">2 meses</option>
            <option value="3">3 meses</option>
          </Select>
        </Field>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving}>{saving ? "Creando…" : "Crear agencia"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function CredencialesPanel({ creada, onClose }: { creada: Creada; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  }
  const Row = ({ label, value, k, href }: { label: string; value: string; k: string; href?: string }) => (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-primary hover:underline">
            {value} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <code className="rounded bg-white px-2 py-0.5 text-sm text-gray-800">{value}</code>
        )}
        <button onClick={() => copy(value, k)} className="text-gray-400 hover:text-gray-700" title="Copiar">
          {copied === k ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="mb-2 flex items-start justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Check className="h-4 w-4 text-green-600" /> Agencia creada — credenciales del administrador
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
      </div>
      <p className="mb-2 text-xs text-amber-700">
        Guardá estos datos: la contraseña temporal se muestra una sola vez. Compartilos con el cliente para su primer acceso.
      </p>
      <div className="divide-y divide-green-100 rounded-md border border-green-100 bg-green-50/50 px-3">
        <Row label="Acceso" value={creada.loginUrl} k="url" href={creada.loginUrl} />
        <Row label="Correo" value={creada.adminEmail} k="email" />
        <Row label="Contraseña temporal" value={creada.tempPassword} k="pass" />
      </div>
    </div>
  );
}
