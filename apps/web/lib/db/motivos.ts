import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type MotivoPerdida = {
  id: string;
  nombre: string;
  creado_en: string;
  oportunidades_count: number;
};

export async function listMotivosPerdida(
  opts: { q?: string } = {},
): Promise<MotivoPerdida[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("motivo_perdida")
    .select("id, nombre, creado_en, oportunidad(count)")
    .order("nombre");
  if (opts.q) {
    query = query.ilike("nombre", `%${opts.q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((m: { id: string; nombre: string; creado_en: string; oportunidad?: { count: number }[] }) => ({
    id: m.id,
    nombre: m.nombre,
    creado_en: m.creado_en,
    oportunidades_count: m.oportunidad?.[0]?.count ?? 0,
  }));
}
