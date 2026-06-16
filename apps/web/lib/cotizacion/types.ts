// Client-safe types + math for quotes (no "server-only").

export type CotizacionItem = {
  producto_id: string | null;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: number;
  costo_unitario?: number; // costo neto (para margen)
};

export type ItinerarioDia = {
  /** ID interno estable del item para usarlo como React key sin perder foco al editar. */
  _uid?: string;
  dia: number;
  titulo: string;
  ciudad?: string | null;
  descripcion?: string | null;
  incluye_comidas?: ("desayuno" | "almuerzo" | "cena")[];
};

export type CotizacionEstado = "borrador" | "enviada" | "aceptada" | "rechazada" | "confirmada";

// ── Cotización armada desde un bloqueo del sitio turistea-web ──────────────
export type TipoHabitacion = "sgl" | "dbl" | "tpl";
export type TipoPax = "adulto" | "nino" | "bebe";

export type ReservaPax = {
  tipo: TipoPax;
  nombre: string;
  documento: string;
  fecha_nacimiento: string;
  habitacion_idx?: number; // 1-based
  habitacion_tipo?: TipoHabitacion;
};
export type ReservaHabitacion = { idx: number; tipo: TipoHabitacion; capacidad: number };
export type ReservaPrecios = { precio_dbl: number; precio_tpl: number; precio_sgl: number; precio_nino: number };
export type ReservaAcom = {
  sencilla: number;
  doble: number;
  triple: number;
  nino: number;
  otros: number;
  otros_valor: number;
};
export type ReservaExtras = {
  supl_asistencia: number;
  penalidades: number;
  tours: number;
  tiquete_adulto: number;
  tiquete_nino: number;
};
export type ReservaLiquidacion = {
  base_comisionable: number;
  comision_pct: number;
  otros_descuentos: number;
  iva_pct: number;
  retefuente_pct: number;
  reteiva_pct: number;
  reteica_pct: number;
  trm: number;
};
/** Todo el detalle cuando la cotización nace de un bloqueo. Va en cotizacion.reserva_data. */
export type ReservaCotizacion = {
  bloqueo_id: string;
  fecha_id: string;
  plan: {
    nombre: string;
    ciudad_origen: string | null;
    dias: number | null;
    noches: number | null;
    fecha_salida: string | null;
    fecha_regreso: string | null;
    aerolinea: string | null;
    moneda: string;
  };
  contacto: { nombre_agente: string; email_agente: string; telefono_agente: string | null; agencia_nombre: string | null };
  habitaciones: ReservaHabitacion[];
  pasajeros: ReservaPax[];
  precios: ReservaPrecios;
  acom: ReservaAcom;
  extras: ReservaExtras;
  liquidacion: ReservaLiquidacion;
  config: { tipo_confirmacion: string; tipo_reserva: string; factura_a: string };
  snapshots: { incluye: string | null; no_incluye: string | null; condiciones: string | null };
  mensaje: string | null;
};

export type Cotizacion = {
  id: string;
  oportunidad_id: string;
  titulo: string;
  moneda: string;
  descuento: number;
  notas: string | null;
  validez_dias: number;
  estado: CotizacionEstado;
  items: CotizacionItem[];
  itinerario?: ItinerarioDia[];
  bloqueo_id?: string | null;
  fecha_id?: string | null;
  reserva?: ReservaCotizacion | null;
  confirmada_en?: string | null;
  enviada_en?: string | null;
  creado_en: string;
};

export const COTIZACION_ESTADOS = ["borrador", "enviada", "aceptada", "rechazada", "confirmada"] as const;

// ── Liquidación (misma lógica que el PDF de confirmación del sitio) ─────────
export type LiquidacionCalc = {
  totalAcom: number;
  comisionVal: number;
  subtotalNeto: number;
  ivaVal: number;
  retefuenteVal: number;
  reteivaVal: number;
  reteicaVal: number;
  totalImpuestos: number;
  totalAPagar: number;
};

// Plan de pagos según tipo de reserva (mismos hitos que el sitio).
export type PagoPlazo = { plazo: string; pct: number; fechaMax: string; valor: number };
export function calcPlanPagos(r: ReservaCotizacion, total: number): PagoPlazo[] {
  const salida = r.plan.fecha_salida;
  if (!salida || total <= 0) return [];
  const esGrupo = (r.config.tipo_reserva || "").startsWith("grupo");
  const hitos = esGrupo
    ? [{ pct: 5, d: 135 }, { pct: 30, d: 130 }, { pct: 60, d: 95 }, { pct: 100, d: 45 }]
    : [{ pct: 20, d: 160 }, { pct: 60, d: 95 }, { pct: 100, d: 45 }];
  let prev = 0;
  return hitos.map((h, i) => {
    const inc = ((h.pct - prev) / 100) * total;
    prev = h.pct;
    const dt = new Date(salida + "T00:00:00");
    dt.setDate(dt.getDate() - h.d);
    return { plazo: `Depósito ${i + 1} (${h.pct}%)`, pct: h.pct, fechaMax: dt.toISOString().slice(0, 10), valor: inc };
  });
}

export function calcLiquidacion(r: ReservaCotizacion): LiquidacionCalc {
  const { precios, acom, extras, liquidacion: liq } = r;
  const totalAcom =
    (Number(precios.precio_dbl) || 0) * (acom.doble || 0) +
    (Number(precios.precio_tpl) || 0) * (acom.triple || 0) +
    (Number(precios.precio_sgl) || 0) * (acom.sencilla || 0) +
    (Number(precios.precio_nino) || 0) * (acom.nino || 0) +
    (acom.otros || 0) * (acom.otros_valor || 0) +
    (extras.supl_asistencia || 0) +
    (extras.penalidades || 0) +
    (extras.tours || 0) +
    (extras.tiquete_adulto || 0) +
    (extras.tiquete_nino || 0);
  const base = Number(liq.base_comisionable) || totalAcom;
  const comisionVal = (base * (Number(liq.comision_pct) || 0)) / 100;
  const subtotalNeto = totalAcom - comisionVal - (Number(liq.otros_descuentos) || 0);
  const ivaVal = (subtotalNeto * (Number(liq.iva_pct) || 0)) / 100;
  const retefuenteVal = (subtotalNeto * (Number(liq.retefuente_pct) || 0)) / 100;
  const reteivaVal = (ivaVal * (Number(liq.reteiva_pct) || 0)) / 100;
  const reteicaVal = (subtotalNeto * (Number(liq.reteica_pct) || 0)) / 100;
  const totalImpuestos = ivaVal - retefuenteVal - reteivaVal - reteicaVal;
  const totalAPagar = subtotalNeto + totalImpuestos;
  return { totalAcom, comisionVal, subtotalNeto, ivaVal, retefuenteVal, reteivaVal, reteicaVal, totalImpuestos, totalAPagar };
}

export function itemSubtotal(it: CotizacionItem): number {
  return (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0);
}

export function cotizacionSubtotal(items: CotizacionItem[]): number {
  return items.reduce((s, it) => s + itemSubtotal(it), 0);
}

export function cotizacionTotal(items: CotizacionItem[], descuento: number): number {
  return Math.max(0, cotizacionSubtotal(items) - (Number(descuento) || 0));
}

export function itemCosto(it: CotizacionItem): number {
  return (Number(it.cantidad) || 0) * (Number(it.costo_unitario) || 0);
}

export function cotizacionCosto(items: CotizacionItem[]): number {
  return items.reduce((s, it) => s + itemCosto(it), 0);
}

/** Margin = sell (after discount) − cost. */
export function cotizacionMargen(items: CotizacionItem[], descuento: number): { margen: number; pct: number | null } {
  const venta = cotizacionTotal(items, descuento);
  const costo = cotizacionCosto(items);
  const margen = venta - costo;
  return { margen, pct: venta > 0 ? Math.round((margen / venta) * 100) : null };
}

export function fmtMoney(value: number, moneda: string): string {
  return new Intl.NumberFormat("es", { style: "currency", currency: moneda || "USD" }).format(value);
}
