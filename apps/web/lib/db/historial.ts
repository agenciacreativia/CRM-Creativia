import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type HistorialEntry = {
  id: string;
  oportunidad_id: string;
  etapa_anterior_nombre: string | null;
  etapa_nueva_nombre: string;
  cambiado_por_nombre: string | null;
  cambiado_en: string;
};

export async function listHistorialOportunidad(oportunidad_id: string): Promise<HistorialEntry[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("historial_etapa")
    .select("id, oportunidad_id, cambiado_en, anterior:etapa_anterior(nombre), nueva:etapa_nueva(nombre), usuario:cambiado_por(nombre)")
    .eq("oportunidad_id", oportunidad_id)
    .order("cambiado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; oportunidad_id: string; cambiado_en: string; anterior: { nombre: string } | { nombre: string }[] | null; nueva: { nombre: string } | { nombre: string }[] | null; usuario: { nombre: string } | { nombre: string }[] | null }) => {
    const oneOf = <T extends { nombre: string }>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? v[0] ?? null : v;
    return {
      id: row.id,
      oportunidad_id: row.oportunidad_id,
      etapa_anterior_nombre: oneOf(row.anterior)?.nombre ?? null,
      etapa_nueva_nombre: oneOf(row.nueva)?.nombre ?? "—",
      cambiado_por_nombre: oneOf(row.usuario)?.nombre ?? null,
      cambiado_en: row.cambiado_en,
    };
  });
}
