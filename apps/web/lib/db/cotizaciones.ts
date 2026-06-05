import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Cotizacion, CotizacionItem, ItinerarioDia } from "@/lib/cotizacion/types";

const COLS = "id, oportunidad_id, titulo, moneda, descuento, notas, validez_dias, estado, items, itinerario, creado_en";

function shape(row: Record<string, unknown>): Cotizacion {
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
    creado_en: row.creado_en as string,
  };
}

/** Quotes for an opportunity. Defensive: [] if table missing (pre-0016). */
export async function listCotizaciones(oportunidadId: string): Promise<Cotizacion[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("cotizacion")
    .select(COLS)
    .eq("oportunidad_id", oportunidadId)
    .order("creado_en", { ascending: false });
  if (error) return [];
  return (data ?? []).map(shape);
}

export async function getCotizacion(id: string): Promise<Cotizacion | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("cotizacion").select(COLS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return shape(data);
}
