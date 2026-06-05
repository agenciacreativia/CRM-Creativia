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
  dia: number;
  titulo: string;
  ciudad?: string | null;
  descripcion?: string | null;
  incluye_comidas?: ("desayuno" | "almuerzo" | "cena")[];
};

export type Cotizacion = {
  id: string;
  oportunidad_id: string;
  titulo: string;
  moneda: string;
  descuento: number;
  notas: string | null;
  validez_dias: number;
  estado: "borrador" | "enviada" | "aceptada" | "rechazada";
  items: CotizacionItem[];
  itinerario?: ItinerarioDia[];
  creado_en: string;
};

export const COTIZACION_ESTADOS = ["borrador", "enviada", "aceptada", "rechazada"] as const;

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
