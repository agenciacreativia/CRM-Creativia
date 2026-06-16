"use client";

import { useMemo, useState, useTransition } from "react";
import { Bed, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type ItinerarioDia,
  type ReservaCotizacion,
  type ReservaPax,
  type TipoHabitacion,
  type TipoPax,
  calcLiquidacion,
  fmtMoney,
} from "@/lib/cotizacion/types";
import type { BloqueoDetalleExterno, SalidaExterna } from "@/lib/db/reservas-externo";
import { saveCotizacionAction, getBloqueoCotizacionAction } from "./cotizacion-actions";
import { ItinerarioEditor } from "./itinerario-editor";

export type PlanLite = { id: string; nombre: string; moneda?: string };
export type ContactoPrefill = {
  nombre_agente: string;
  email_agente: string;
  telefono_agente: string | null;
  agencia_nombre: string | null;
};

type Habitacion = { tipo: TipoHabitacion; pasajeros: Pax[] };
type Pax = { tipo: TipoPax; nombre: string; documento: string; fecha_nacimiento: string };

const HAB_CAP: Record<TipoHabitacion, number> = { sgl: 1, dbl: 2, tpl: 3 };
const HAB_LABEL: Record<TipoHabitacion, string> = { sgl: "Sencilla (1)", dbl: "Doble (2)", tpl: "Triple (3)" };
const PAX_LABEL: Record<TipoPax, string> = { adulto: "Adulto", nino: "Niño", bebe: "Infante" };

function paxVacio(tipo: TipoPax): Pax {
  return { tipo, nombre: "", documento: "", fecha_nacimiento: "" };
}
function habVacia(tipo: TipoHabitacion): Habitacion {
  return { tipo, pasajeros: Array.from({ length: HAB_CAP[tipo] }, () => paxVacio("adulto")) };
}
const n = (v: unknown) => Number(v) || 0;

export function CotizacionBloqueoForm({
  oportunidadId,
  planes,
  prefill,
  onDone,
  onCancel,
}: {
  oportunidadId: string;
  planes: PlanLite[];
  prefill: ContactoPrefill;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [bloqueoId, setBloqueoId] = useState("");
  const [detalle, setDetalle] = useState<BloqueoDetalleExterno | null>(null);
  const [fechaId, setFechaId] = useState("");
  const [loadingDetalle, startLoad] = useTransition();

  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([habVacia("dbl")]);
  const [nombreAgente, setNombreAgente] = useState(prefill.nombre_agente);
  const [emailAgente, setEmailAgente] = useState(prefill.email_agente);
  const [telefonoAgente, setTelefonoAgente] = useState(prefill.telefono_agente ?? "");
  const [agenciaNombre, setAgenciaNombre] = useState(prefill.agencia_nombre ?? "");
  const [mensaje, setMensaje] = useState("");
  const [titulo, setTitulo] = useState("Cotización de viaje");
  const [itinerario, setItinerario] = useState<ItinerarioDia[]>([]);

  // Config de la reserva
  const [tipoConfirmacion, setTipoConfirmacion] = useState("bloqueo");
  const [tipoReserva, setTipoReserva] = useState("grupo_bloqueo");
  const [facturaA, setFacturaA] = useState("agencia");

  // Liquidación (editable)
  const [baseComisionable, setBaseComisionable] = useState(0);
  const [comisionPct, setComisionPct] = useState(0);
  const [otrosDescuentos, setOtrosDescuentos] = useState(0);
  const [ivaPct, setIvaPct] = useState(0);
  const [retefuentePct, setRetefuentePct] = useState(0);
  const [reteivaPct, setReteivaPct] = useState(0);
  const [reteicaPct, setReteicaPct] = useState(0);
  const [trm, setTrm] = useState(0);
  const [acomOtros, setAcomOtros] = useState(0);
  const [acomOtrosValor, setAcomOtrosValor] = useState(0);
  const [suplAsistencia, setSuplAsistencia] = useState(0);
  const [penalidades, setPenalidades] = useState(0);
  const [tours, setTours] = useState(0);
  const [tiqueteAdulto, setTiqueteAdulto] = useState(0);
  const [tiqueteNino, setTiqueteNino] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fecha: SalidaExterna | null = useMemo(
    () => detalle?.fechas.find((f) => f.id === fechaId) ?? null,
    [detalle, fechaId],
  );
  const moneda = detalle?.moneda ?? "USD";

  // ── Cargar detalle al elegir plan ──────────────────────────────────────
  function onPlanChange(id: string) {
    setBloqueoId(id);
    setDetalle(null);
    setFechaId("");
    if (!id) return;
    startLoad(async () => {
      const d = await getBloqueoCotizacionAction(id);
      if (!d) {
        setError("No se pudo cargar el plan desde el sitio.");
        return;
      }
      setDetalle(d);
      const f0 = d.fechas[0];
      setFechaId(f0?.id ?? "");
      setTitulo(d.nombre);
      // Itinerario prellenado desde el bloqueo (si tiene).
      setItinerario(
        d.itinerario.map((it) => ({ dia: it.dia, titulo: it.titulo, ciudad: it.ciudad, descripcion: it.descripcion })),
      );
      // Liquidación base desde la salida.
      setBaseComisionable(n(f0?.base_comisionable));
      setComisionPct(n(f0?.comision_pct));
      setSuplAsistencia(n(d.suplemento_asistencia_70));
    });
  }

  // ── Habitaciones / PAX ─────────────────────────────────────────────────
  function addHab(tipo: TipoHabitacion) {
    setHabitaciones((h) => [...h, habVacia(tipo)]);
  }
  function delHab(i: number) {
    setHabitaciones((h) => h.filter((_, idx) => idx !== i));
  }
  function cambiarTipoHab(i: number, tipo: TipoHabitacion) {
    setHabitaciones((h) =>
      h.map((hab, idx) => {
        if (idx !== i) return hab;
        const cap = HAB_CAP[tipo];
        return { tipo, pasajeros: Array.from({ length: cap }, (_, j) => hab.pasajeros[j] ?? paxVacio("adulto")) };
      }),
    );
  }
  function setPax(hi: number, pi: number, patch: Partial<Pax>) {
    setHabitaciones((h) =>
      h.map((hab, i) =>
        i !== hi ? hab : { ...hab, pasajeros: hab.pasajeros.map((p, j) => (j !== pi ? p : { ...p, ...patch })) },
      ),
    );
  }

  // Pasajeros aplanados (con vínculo a habitación) — base para la liquidación.
  const pasajeros: ReservaPax[] = useMemo(
    () =>
      habitaciones.flatMap((h, hi) =>
        h.pasajeros.map((p) => ({ ...p, habitacion_idx: hi + 1, habitacion_tipo: h.tipo })),
      ),
    [habitaciones],
  );
  const acom = useMemo(() => {
    const a = { sencilla: 0, doble: 0, triple: 0, nino: 0, otros: acomOtros, otros_valor: acomOtrosValor };
    for (const h of habitaciones) {
      if (h.tipo === "sgl") a.sencilla++;
      else if (h.tipo === "dbl") a.doble++;
      else if (h.tipo === "tpl") a.triple++;
    }
    a.nino = pasajeros.filter((p) => p.tipo === "nino").length;
    return a;
  }, [habitaciones, pasajeros, acomOtros, acomOtrosValor]);

  const reserva: ReservaCotizacion | null = useMemo(() => {
    if (!detalle || !fecha) return null;
    return {
      bloqueo_id: detalle.id,
      fecha_id: fecha.id,
      plan: {
        nombre: detalle.nombre,
        ciudad_origen: detalle.ciudad_origen,
        dias: detalle.dias,
        noches: detalle.noches,
        fecha_salida: fecha.fecha_salida,
        fecha_regreso: fecha.fecha_regreso,
        aerolinea: fecha.aerolinea,
        moneda: detalle.moneda,
      },
      contacto: {
        nombre_agente: nombreAgente.trim(),
        email_agente: emailAgente.trim(),
        telefono_agente: telefonoAgente.trim() || null,
        agencia_nombre: agenciaNombre.trim() || null,
      },
      habitaciones: habitaciones.map((h, i) => ({ idx: i + 1, tipo: h.tipo, capacidad: HAB_CAP[h.tipo] })),
      pasajeros,
      precios: {
        precio_dbl: n(fecha.precio_dbl),
        precio_tpl: n(fecha.precio_tpl),
        precio_sgl: n(fecha.precio_sgl),
        precio_nino: n(fecha.precio_nino),
      },
      acom,
      extras: {
        supl_asistencia: n(suplAsistencia),
        penalidades: n(penalidades),
        tours: n(tours),
        tiquete_adulto: n(tiqueteAdulto),
        tiquete_nino: n(tiqueteNino),
      },
      liquidacion: {
        base_comisionable: n(baseComisionable),
        comision_pct: n(comisionPct),
        otros_descuentos: n(otrosDescuentos),
        iva_pct: n(ivaPct),
        retefuente_pct: n(retefuentePct),
        reteiva_pct: n(reteivaPct),
        reteica_pct: n(reteicaPct),
        trm: n(trm),
      },
      config: { tipo_confirmacion: tipoConfirmacion, tipo_reserva: tipoReserva, factura_a: facturaA },
      snapshots: { incluye: detalle.incluye, no_incluye: detalle.no_incluye, condiciones: detalle.condiciones_adicionales },
      mensaje: mensaje.trim() || null,
    };
  }, [detalle, fecha, nombreAgente, emailAgente, telefonoAgente, agenciaNombre, habitaciones, pasajeros, acom,
      suplAsistencia, penalidades, tours, tiqueteAdulto, tiqueteNino, baseComisionable, comisionPct, otrosDescuentos,
      ivaPct, retefuentePct, reteivaPct, reteicaPct, trm, tipoConfirmacion, tipoReserva, facturaA, mensaje]);

  const liq = useMemo(() => (reserva ? calcLiquidacion(reserva) : null), [reserva]);

  async function save() {
    setError(null);
    if (!reserva || !liq) {
      setError("Elegí un plan y una salida.");
      return;
    }
    if (!nombreAgente.trim() || !emailAgente.includes("@")) {
      setError("Completá el nombre y un email válido del agente.");
      return;
    }
    if (!pasajeros[0]?.nombre.trim() || !pasajeros[0]?.documento.trim()) {
      setError("El pasajero principal necesita nombre y documento.");
      return;
    }
    setSaving(true);
    const res = await saveCotizacionAction({
      id: null,
      oportunidad_id: oportunidadId,
      titulo: titulo.trim() || detalle?.nombre || "Cotización",
      moneda: moneda as "USD" | "ARS" | "EUR" | "MXN" | "COP" | "CLP" | "PEN" | "BRL",
      descuento: 0,
      notas: mensaje.trim() || null,
      validez_dias: 15,
      estado: "borrador",
      items: [
        {
          producto_id: null,
          nombre: `${detalle?.nombre ?? "Plan"} — Salida ${fecha?.fecha_salida ?? ""}`,
          descripcion: `${acom.sencilla} sgl · ${acom.doble} dbl · ${acom.triple} tpl · ${acom.nino} niño(s)`,
          cantidad: 1,
          precio_unitario: liq.totalAPagar,
          costo_unitario: 0,
        },
      ],
      itinerario,
      bloqueo_id: reserva.bloqueo_id,
      fecha_id: reserva.fecha_id,
      reserva,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error al guardar");
      return;
    }
    onDone();
  }

  const numCls = "h-9 w-full rounded-md border border-gray-300 px-2 text-right text-sm";

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}

      {/* Plan + salida */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Plan Turistea">
          <Select value={bloqueoId} onChange={(e) => onPlanChange(e.target.value)}>
            <option value="">— Elegí un plan —</option>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Salida">
          <Select value={fechaId} onChange={(e) => setFechaId(e.target.value)} disabled={!detalle || loadingDetalle}>
            {loadingDetalle && <option>Cargando…</option>}
            {!loadingDetalle && !detalle && <option value="">Elegí un plan primero</option>}
            {detalle?.fechas.length === 0 && <option value="">Sin salidas vigentes</option>}
            {detalle?.fechas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fecha_salida}{f.fecha_regreso ? ` → ${f.fecha_regreso}` : ""} · {f.cupos_disponibles ?? 0} cupos{f.aerolinea ? ` · ${f.aerolinea}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {loadingDetalle && (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando plan…</p>
      )}

      {detalle && fecha && (
        <>
          <Field label="Título de la cotización"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>

          {/* Habitaciones */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-gray-500">
                <Bed className="h-4 w-4 text-brand-primary" /> Habitaciones
              </h3>
              <div className="flex items-center gap-1.5">
                {(["sgl", "dbl", "tpl"] as TipoHabitacion[]).map((t) => (
                  <button key={t} type="button" onClick={() => addHab(t)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:border-brand-primary">
                    <Plus className="h-3 w-3" /> {HAB_LABEL[t].split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {habitaciones.map((hab, hi) => (
                <div key={hi} className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">{hi + 1}</span>
                    <select value={hab.tipo} onChange={(e) => cambiarTipoHab(hi, e.target.value as TipoHabitacion)}
                      className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold">
                      {(["sgl", "dbl", "tpl"] as TipoHabitacion[]).map((t) => <option key={t} value={t}>{HAB_LABEL[t]}</option>)}
                    </select>
                    <button type="button" onClick={() => delHab(hi)} disabled={habitaciones.length === 1}
                      className="ml-auto text-gray-400 hover:text-status-danger disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="space-y-1.5">
                    {hab.pasajeros.map((p, pi) => (
                      <div key={pi} className="grid grid-cols-1 gap-1.5 md:grid-cols-12">
                        <select value={p.tipo} onChange={(e) => setPax(hi, pi, { tipo: e.target.value as TipoPax })}
                          className="h-9 rounded-md border border-gray-300 px-2 text-xs md:col-span-2">
                          {(["adulto", "nino", "bebe"] as TipoPax[]).map((t) => <option key={t} value={t}>{PAX_LABEL[t]}</option>)}
                        </select>
                        <input value={p.nombre} onChange={(e) => setPax(hi, pi, { nombre: e.target.value })}
                          placeholder={hi === 0 && pi === 0 ? "Nombre completo *" : "Nombre completo"}
                          className="h-9 rounded-md border border-gray-300 px-2 text-sm md:col-span-5" />
                        <input value={p.documento} onChange={(e) => setPax(hi, pi, { documento: e.target.value })}
                          placeholder={hi === 0 && pi === 0 ? "Documento *" : "Documento"}
                          className="h-9 rounded-md border border-gray-300 px-2 text-sm md:col-span-2" />
                        <input type="date" value={p.fecha_nacimiento} onChange={(e) => setPax(hi, pi, { fecha_nacimiento: e.target.value })}
                          className="h-9 rounded-md border border-gray-300 px-2 text-sm md:col-span-3" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Datos de la agencia */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nombre del agente *"><Input value={nombreAgente} onChange={(e) => setNombreAgente(e.target.value)} /></Field>
            <Field label="Email *"><Input type="email" value={emailAgente} onChange={(e) => setEmailAgente(e.target.value)} /></Field>
            <Field label="Teléfono / WhatsApp"><Input value={telefonoAgente} onChange={(e) => setTelefonoAgente(e.target.value)} /></Field>
            <Field label="Agencia"><Input value={agenciaNombre} onChange={(e) => setAgenciaNombre(e.target.value)} /></Field>
            <div className="md:col-span-2">
              <Field label="Mensaje / preferencias (opcional)">
                <Textarea rows={2} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Preferencias de habitación, requerimientos alimentarios, etc." />
              </Field>
            </div>
          </section>

          {/* Itinerario (prellenado del bloqueo) */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-gray-500">Itinerario</h3>
            {detalle.itinerario.length === 0 && (
              <p className="text-xs text-gray-400">Este plan no tiene itinerario cargado en el sitio. Podés agregarlo manualmente.</p>
            )}
            <ItinerarioEditor itinerario={itinerario} onChange={setItinerario} />
          </section>

          {/* Liquidación */}
          <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-bold uppercase text-gray-500">Liquidación</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-4">
              <LiqNum label="Comisión %" v={comisionPct} set={setComisionPct} cls={numCls} />
              <LiqNum label="Base comisionable" v={baseComisionable} set={setBaseComisionable} cls={numCls} />
              <LiqNum label="Otros descuentos" v={otrosDescuentos} set={setOtrosDescuentos} cls={numCls} />
              <LiqNum label="TRM" v={trm} set={setTrm} cls={numCls} />
              <LiqNum label="IVA %" v={ivaPct} set={setIvaPct} cls={numCls} />
              <LiqNum label="Retefuente %" v={retefuentePct} set={setRetefuentePct} cls={numCls} />
              <LiqNum label="ReteIVA %" v={reteivaPct} set={setReteivaPct} cls={numCls} />
              <LiqNum label="ReteICA %" v={reteicaPct} set={setReteicaPct} cls={numCls} />
              <LiqNum label="Supl. asistencia" v={suplAsistencia} set={setSuplAsistencia} cls={numCls} />
              <LiqNum label="Penalidades" v={penalidades} set={setPenalidades} cls={numCls} />
              <LiqNum label="Tours opcionales" v={tours} set={setTours} cls={numCls} />
              <LiqNum label="Tiquete adulto" v={tiqueteAdulto} set={setTiqueteAdulto} cls={numCls} />
              <LiqNum label="Tiquete niño" v={tiqueteNino} set={setTiqueteNino} cls={numCls} />
              <LiqNum label="Otros (cant.)" v={acomOtros} set={setAcomOtros} cls={numCls} />
              <LiqNum label="Otros (valor)" v={acomOtrosValor} set={setAcomOtrosValor} cls={numCls} />
            </div>
            {liq && (
              <div className="space-y-1 border-t border-gray-200 pt-2 text-sm">
                <Row label={`Acomodación (${acom.sencilla} sgl · ${acom.doble} dbl · ${acom.triple} tpl · ${acom.nino} niño)`} v={fmtMoney(liq.totalAcom, moneda)} />
                <Row label="Comisión" v={`− ${fmtMoney(liq.comisionVal, moneda)}`} />
                <Row label="Subtotal neto" v={fmtMoney(liq.subtotalNeto, moneda)} />
                <Row label="Impuestos (neto)" v={fmtMoney(liq.totalImpuestos, moneda)} />
                <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold text-gray-900">
                  <span>Total a pagar</span><span>{fmtMoney(liq.totalAPagar, moneda)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Config */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Tipo de confirmación">
              <Select value={tipoConfirmacion} onChange={(e) => setTipoConfirmacion(e.target.value)}>
                <option value="bloqueo">Bloqueo</option>
                <option value="individual">Individual</option>
                <option value="porcion_terrestre">Porción terrestre</option>
                <option value="tiquete_aereo">Tiquete aéreo</option>
              </Select>
            </Field>
            <Field label="Tipo de reserva">
              <Select value={tipoReserva} onChange={(e) => setTipoReserva(e.target.value)}>
                <option value="grupo_bloqueo">Grupo bloqueo</option>
                <option value="grupo_no_bloqueo">Grupo no bloqueo</option>
                <option value="venta_individual">Venta individual</option>
              </Select>
            </Field>
            <Field label="Factura a">
              <Select value={facturaA} onChange={(e) => setFacturaA(e.target.value)}>
                <option value="agencia">Agencia</option>
                <option value="pasajero">Pasajero</option>
              </Select>
            </Field>
          </section>
        </>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <Button type="button" onClick={save} disabled={saving || !reserva} className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar cotización"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function LiqNum({ label, v, set, cls }: { label: string; v: number; set: (n: number) => void; cls: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      <input type="number" step="0.01" value={v} onChange={(e) => set(Number(e.target.value))} className={cls} />
    </label>
  );
}
function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span><span className="tabular-nums">{v}</span>
    </div>
  );
}
