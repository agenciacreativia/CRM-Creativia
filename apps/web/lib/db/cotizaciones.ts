import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Cotizacion, CotizacionItem, ItinerarioDia, ReservaCotizacion } from "@/lib/cotizacion/types";

// Columnas de cotizaciones-desde-bloqueo (migración 0045). Se piden aparte para
// poder degradar a la lista básica si la migración aún no se corrió.
const COLS_BASE = "id, oportunidad_id, titulo, moneda, descuento, notas, validez_dias, estado, items, itinerario, creado_en";
const COLS_FULL = `${COLS_BASE}, bloqueo_id, fecha_id, reserva_data, confirmada_en, enviada_en`;

function shape(row: Record<string, unknown>): Cotizacion {
  const reservaData = row.reserva_data as ReservaCotizacion | null | undefined;
  const reserva = reservaData && typeof reservaData === "object" && "bloqueo_id" in reservaData ? reservaData : null;
  return {
    id: row.id as string,
    oportunidad_id: row.oportunidad_id as string,
    titulo: (row.titulo as string) ?? "Cotización",
    moneda: (row.moneda as string) ?? "USD",
    descuento: Number(row.descuento) || 0,
    notas: (row.notas as string) ?? null,
    validez_dias: Number(row.validez_dias) || 15,
    estado: (row.estado as Cotizacion["estado"]) ?? "borrador",
    items: Array.isArray(row.items) ? (row.items as CotizacionItem[]) : [],
    itinerario: Array.isArray(row.itinerario) ? (row.itinerario as ItinerarioDia[]) : [],
    bloqueo_id: (row.bloqueo_id as string | null) ?? null,
    fecha_id: (row.fecha_id as string | null) ?? null,
    reserva,
    confirmada_en: (row.confirmada_en as string | null) ?? null,
    enviada_en: (row.enviada_en as string | null) ?? null,
    creado_en: row.creado_en as string,
  };
}

const missingBloqueoCols = (msg: string | undefined): boolean =>
  !!msg && /column.*(reserva_data|bloqueo_id|fecha_id|confirmada_en|enviada_en).*does not exist/i.test(msg);

/** Quotes for an opportunity. Defensive: degrada a columnas base si 0045 no se corrió. */
export async function listCotizaciones(oportunidadId: string): Promise<Cotizacion[]> {
  const supabase = await createServerSupabase();
  const full = await supabase
    .from("cotizacion")
    .select(COLS_FULL)
    .eq("oportunidad_id", oportunidadId)
    .order("creado_en", { ascending: false });
  let rows = full.data as Record<string, unknown>[] | null;
  let err = full.error;
  if (err && missingBloqueoCols(err.message)) {
    const base = await supabase
      .from("cotizacion")
      .select(COLS_BASE)
      .eq("oportunidad_id", oportunidadId)
      .order("creado_en", { ascending: false });
    rows = base.data as Record<string, unknown>[] | null;
    err = base.error;
  }
  if (err) return [];
  return (rows ?? []).map(shape);
}

export async function getCotizacion(id: string): Promise<Cotizacion | null> {
  const supabase = await createServerSupabase();
  const full = await supabase.from("cotizacion").select(COLS_FULL).eq("id", id).maybeSingle();
  let row = full.data as Record<string, unknown> | null;
  let err = full.error;
  if (err && missingBloqueoCols(err.message)) {
    const base = await supabase.from("cotizacion").select(COLS_BASE).eq("id", id).maybeSingle();
    row = base.data as Record<string, unknown> | null;
    err = base.error;
  }
  if (err || !row) return null;
  return shape(row);
}
