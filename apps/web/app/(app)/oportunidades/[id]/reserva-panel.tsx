"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Plus, X, Check, ExternalLink, Plane, Users, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SalidaExterna } from "@/lib/db/reservas-externo";
import type { Reserva } from "@/lib/db/reservas";
import { getSalidasAction, crearReservaAction, cancelarReservaAction, registrarPagoAction } from "./reserva-actions";

type PlanOpt = { id: string; nombre: string; moneda: string };
type PaxLite = { nombre: string; tipo: string };

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  pendiente: "warn", confirmada: "success", emitida: "success", cancelada: "danger",
};
function money(v: number | null, m: string) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export function ReservaPanel({
  oportunidadId,
  planes,
  reservas,
  pasajeros,
}: {
  oportunidadId: string;
  planes: PlanOpt[];
  reservas: Reserva[];
  pasajeros: PaxLite[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pagoFor, setPagoFor] = useState<string | null>(null);

  async function cancelar(id: string) {
    if (!confirm("¿Cancelar esta reserva? Se cancela también en el sitio de Turistea.")) return;
    const res = await cancelarReservaAction(id, oportunidadId);
    if (!res.ok) setError(res.error ?? "Error");
    else router.refresh();
  }

  const adultos = pasajeros.filter((p) => p.tipo === "adulto").length;
  const ninos = pasajeros.filter((p) => p.tipo === "nino").length;
  const bebes = pasajeros.filter((p) => p.tipo === "bebe").length;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
          <Ticket className="h-4 w-4" /> Reservas Turistea
        </h2>
        {!creating && (
          <Button type="button" size="sm" onClick={() => { setCreating(true); setError(null); setOkMsg(null); }} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nueva reserva
          </Button>
        )}
      </div>

      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      {okMsg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-gray-800"><Check className="mr-1 inline h-4 w-4 text-green-600" />{okMsg}</div>}

      {creating && (
        <ReservaForm
          oportunidadId={oportunidadId}
          planes={planes}
          pax={{ adultos, ninos, bebes, total: pasajeros.length }}
          onCancel={() => setCreating(false)}
          onDone={(sid) => { setCreating(false); setOkMsg(`Reserva enviada a Turistea (${sid.slice(0, 8)}…) con ${pasajeros.length} pasajero(s).`); router.refresh(); }}
          onError={setError}
        />
      )}

      {reservas.length === 0 && !creating ? (
        <p className="py-4 text-center text-sm text-gray-500">Sin reservas. Cargá los pasajeros y creá una.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {reservas.map((r) => (
            <li key={r.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.plan_nombre}</p>
                  <p className="text-xs text-gray-500">
                    {r.salida_fecha ?? "sin fecha"} · {r.adultos + r.ninos + r.bebes} pax · {money(r.monto, r.moneda)}
                    {r.solicitud_externa_id && <> · sol. {r.solicitud_externa_id.slice(0, 8)}…</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ESTADO_BADGE[r.estado] ?? "default"}>{r.estado}</Badge>
                  {r.estado !== "cancelada" && r.solicitud_externa_id && (
                    <button onClick={() => setPagoFor(pagoFor === r.id ? null : r.id)} className="text-gray-400 hover:text-green-600" title="Registrar pago">
                      <DollarSign className="h-4 w-4" />
                    </button>
                  )}
                  {r.estado !== "cancelada" && (
                    <button onClick={() => cancelar(r.id)} className="text-gray-400 hover:text-status-danger" title="Cancelar reserva">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {pagoFor === r.id && r.solicitud_externa_id && (
                <PagoForm
                  oportunidadId={oportunidadId}
                  solicitudId={r.solicitud_externa_id}
                  moneda={r.moneda}
                  onCancel={() => setPagoFor(null)}
                  onDone={() => { setPagoFor(null); setOkMsg("Pago registrado en Turistea."); router.refresh(); }}
                  onError={setError}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReservaForm({
  oportunidadId,
  planes,
  pax,
  onCancel,
  onDone,
  onError,
}: {
  oportunidadId: string;
  planes: PlanOpt[];
  pax: { adultos: number; ninos: number; bebes: number; total: number };
  onCancel: () => void;
  onDone: (solicitudId: string) => void;
  onError: (e: string) => void;
}) {
  const [planId, setPlanId] = useState("");
  const [salidas, setSalidas] = useState<SalidaExterna[]>([]);
  const [fechaId, setFechaId] = useState("");
  const [loadingSalidas, setLoadingSalidas] = useState(false);
  const [saving, setSaving] = useState(false);

  const plan = planes.find((p) => p.id === planId);
  const salida = salidas.find((s) => s.id === fechaId);
  // Estimación de monto: usa precio doble (DBL) para los adultos como base.
  // Es una estimación: la habitación SGL/TPL real depende de la composición de
  // habitaciones, que se decide más adelante. Para evitar surprise en la
  // estimación incluimos también precio_bebe si está disponible.
  type SalidaConBebe = SalidaExterna & { precio_bebe?: number | null };
  const sBebes = (salida as SalidaConBebe | undefined)?.precio_bebe ?? 0;
  const monto = salida?.precio_dbl != null
    ? salida.precio_dbl * pax.adultos + (salida.precio_nino ?? 0) * pax.ninos + sBebes * pax.bebes
    : null;

  async function onPickPlan(id: string) {
    setPlanId(id); setFechaId(""); setSalidas([]);
    if (!id) return;
    setLoadingSalidas(true);
    const res = await getSalidasAction(id);
    setLoadingSalidas(false);
    if (res.ok) setSalidas(res.salidas ?? []); else onError(res.error ?? "Error");
  }

  async function save() {
    if (pax.total === 0) return onError("Cargá al menos un pasajero antes de reservar.");
    if (!plan || !salida) return onError("Elegí plan y salida.");
    setSaving(true);
    const res = await crearReservaAction({
      oportunidadId, bloqueoId: plan.id, fechaId: salida.id, planNombre: plan.nombre,
      salidaFecha: salida.fecha_salida, monto, moneda: plan.moneda || "USD",
    });
    setSaving(false);
    if (!res.ok) onError(res.error ?? "Error"); else onDone(res.solicitudId ?? "");
  }

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="flex items-center gap-1.5 text-sm text-gray-700">
        <Users className="h-4 w-4 text-gray-400" />
        {pax.total === 0 ? (
          <span className="text-amber-700">No hay pasajeros cargados. Agregalos en la sección «Pasajeros» de la oportunidad.</span>
        ) : (
          <span><b>{pax.total}</b> pasajero(s): {pax.adultos} adulto(s){pax.ninos ? `, ${pax.ninos} niño(s)` : ""}{pax.bebes ? `, ${pax.bebes} bebé(s)` : ""} — viajan con sus documentos.</span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Plan</label>
          <Select value={planId} onChange={(e) => onPickPlan(e.target.value)}>
            <option value="">Elegí un plan…</option>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Salida (cupos en vivo)</label>
          <Select value={fechaId} onChange={(e) => setFechaId(e.target.value)} disabled={!planId || loadingSalidas}>
            <option value="">{loadingSalidas ? "Cargando…" : "Elegí salida…"}</option>
            {salidas.map((s) => (
              <option key={s.id} value={s.id}>{s.fecha_salida} · {s.cupos_disponibles ?? "?"} cupos · {s.aerolinea ?? ""} · {money(s.precio_dbl, plan?.moneda ?? "USD")}</option>
            ))}
          </Select>
        </div>
      </div>

      {salida && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <Plane className="h-3.5 w-3.5" /> {salida.fecha_salida} → {salida.fecha_regreso ?? "?"} · {salida.cupos_disponibles ?? "?"} cupos · dbl {money(salida.precio_dbl, plan?.moneda ?? "USD")} · sgl {money(salida.precio_sgl, plan?.moneda ?? "USD")}
        </p>
      )}
      {monto != null && <p className="text-sm text-gray-700">Monto estimado: <span className="font-semibold">{money(monto, plan?.moneda ?? "USD")}</span></p>}

      <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button type="button" onClick={save} disabled={saving || !fechaId || pax.total === 0} className="inline-flex items-center gap-1.5">
          <ExternalLink className="h-4 w-4" /> {saving ? "Enviando a Turistea…" : "Reservar"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function PagoForm({
  oportunidadId,
  solicitudId,
  moneda,
  onCancel,
  onDone,
  onError,
}: {
  oportunidadId: string;
  solicitudId: string;
  moneda: string;
  onCancel: () => void;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("transferencia");
  const [fecha, setFecha] = useState(hoy);
  const [referencia, setReferencia] = useState("");
  const [saving, setSaving] = useState(false);

  async function guardar() {
    const m = Number(monto);
    if (!m || m <= 0) return onError("Ingresá un monto válido.");
    setSaving(true);
    const res = await registrarPagoAction({ solicitudId, oportunidadId, monto: m, moneda, fecha_pago: fecha, metodo, referencia: referencia || undefined });
    setSaving(false);
    if (!res.ok) onError(res.error ?? "Error"); else onDone();
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="w-28">
        <label className="mb-1 block text-xs text-gray-500">Monto ({moneda})</label>
        <Input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs text-gray-500">Método</label>
        <Select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="efectivo">Efectivo</option>
          <option value="otro">Otro</option>
        </Select>
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs text-gray-500">Fecha</label>
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="min-w-32 flex-1">
        <label className="mb-1 block text-xs text-gray-500">Referencia (opcional)</label>
        <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="N° comprobante" />
      </div>
      <Button type="button" size="sm" onClick={guardar} disabled={saving} className="inline-flex items-center gap-1">
        <DollarSign className="h-3.5 w-3.5" /> {saving ? "Registrando…" : "Registrar pago"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
    </div>
  );
}
