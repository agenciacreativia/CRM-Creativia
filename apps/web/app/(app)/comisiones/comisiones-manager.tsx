"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ROLES_COMERCIALES, type ComisionAsesor, type RolComercial } from "@/lib/comisiones-types";
import { setComisionConfigAction } from "./actions";

const ROL_LABEL: Record<string, string> = Object.fromEntries(ROLES_COMERCIALES.map((r) => [r.key, r.label]));

function money(v: number, m: string) {
  return new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export function ComisionesManager({ initial }: { initial: ComisionAsesor[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Elegimos la moneda dominante (la del primer asesor con ventas) y solo sumamos
  // los asesores que comparten esa moneda para evitar mezclar USD/ARS en el KPI.
  const moneda = initial.find((a) => a.ventas > 0)?.moneda ?? "USD";
  const enMoneda = initial.filter((a) => a.moneda === moneda);
  const totalVentas = enMoneda.reduce((s, a) => s + a.ventas, 0);
  const totalComision = enMoneda.reduce((s, a) => s + a.comision, 0);
  const monedasDistintas = new Set(initial.filter((a) => a.ventas > 0).map((a) => a.moneda)).size > 1;

  return (
    <div className="space-y-3">
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      {monedasDistintas && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Hay asesores con monedas distintas. Los totales mostrados solo incluyen los registros en {moneda}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="Ventas ganadas (mes)" value={money(totalVentas, moneda)} />
        <Kpi label="Comisiones a pagar" value={money(totalComision, moneda)} />
        <Kpi label="Asesores con ventas" value={String(initial.filter((a) => a.ventas > 0).length)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Asesor</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium text-right">% Com.</th>
              <th className="px-4 py-2 font-medium text-right">Meta</th>
              <th className="px-4 py-2 font-medium text-right">Ventas</th>
              <th className="px-4 py-2 font-medium text-right">Cumpl.</th>
              <th className="px-4 py-2 font-medium text-right">Comisión</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">Sin asesores.</td></tr>
            )}
            {initial.map((a) =>
              editing === a.id ? (
                <EditRow key={a.id} a={a} onDone={() => { setEditing(null); router.refresh(); }} onCancel={() => setEditing(null)} onError={setError} />
              ) : (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{a.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.rol_comercial ? ROL_LABEL[a.rol_comercial] : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{a.comision_pct}%</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{a.meta_mensual != null ? money(a.meta_mensual, a.moneda) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{money(a.ventas, a.moneda)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {a.cumplimiento_pct != null ? (
                      <Badge variant={a.cumplimiento_pct >= 100 ? "success" : a.cumplimiento_pct >= 70 ? "warn" : "default"}>{a.cumplimiento_pct}%</Badge>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-brand-primary">{money(a.comision, a.moneda)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setEditing(a.id)} className="text-gray-400 hover:text-brand-primary" title="Configurar comisión"><Pencil className="h-4 w-4" /></button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Comisión = ventas ganadas del mes × % del asesor. El cumplimiento compara contra la meta mensual.</p>
    </div>
  );
}

function EditRow({ a, onDone, onCancel, onError }: { a: ComisionAsesor; onDone: () => void; onCancel: () => void; onError: (e: string) => void }) {
  const [rol, setRol] = useState<RolComercial | "">(a.rol_comercial ?? "");
  const [pct, setPct] = useState(String(a.comision_pct));
  const [meta, setMeta] = useState(a.meta_mensual != null ? String(a.meta_mensual) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await setComisionConfigAction(a.id, {
      rol_comercial: (rol || null) as RolComercial | null,
      comision_pct: Number(pct) || 0,
      meta_mensual: meta ? Number(meta) : null,
    });
    setSaving(false);
    if (!res.ok) onError(res.error ?? "Error"); else onDone();
  }

  return (
    <tr className="border-t border-gray-100 bg-blue-50/40">
      <td className="px-4 py-2 font-medium text-gray-900">{a.nombre}</td>
      <td className="px-4 py-2">
        <Select value={rol} onChange={(e) => setRol(e.target.value as RolComercial)} className="w-36">
          <option value="">—</option>
          {ROLES_COMERCIALES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </Select>
      </td>
      <td className="px-4 py-2"><Input type="number" min="0" max="100" step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} className="w-20 text-right" /></td>
      <td className="px-4 py-2"><Input type="number" min="0" value={meta} onChange={(e) => setMeta(e.target.value)} className="w-28 text-right" placeholder="meta" /></td>
      <td className="px-4 py-2.5 text-right text-gray-400" colSpan={3}>—</td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
