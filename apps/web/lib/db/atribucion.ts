import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { ESTRATEGIA_LABEL } from "@/lib/estrategias-types";

export type AtribucionRow = { estrategia: string; label: string; cuenta: number; valor: number; ganadas: number; perdidas: number; tasa_cierre: number | null };

/** Attribution by commercial strategy across all opportunities. Defensive: []. */
export async function listAtribucionPorEstrategia(): Promise<AtribucionRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad")
    .select("valor, estado, estrategia");
  if (error) {
    console.error("[atribucion] listAtribucionPorEstrategia:", error.message);
    return [];
  }

  const map = new Map<string, { cuenta: number; valor: number; ganadas: number; perdidas: number }>();
  for (const o of (data ?? []) as { valor: number | null; estado: string; estrategia: string | null }[]) {
    const key = o.estrategia ?? "sin_estrategia";
    const cur = map.get(key) ?? { cuenta: 0, valor: 0, ganadas: 0, perdidas: 0 };
    cur.cuenta += 1;
    cur.valor += o.valor ?? 0;
    if (o.estado === "ganado") cur.ganadas += 1;
    if (o.estado === "perdido") cur.perdidas += 1;
    map.set(key, cur);
  }

  return [...map.entries()]
    .map(([estrategia, v]) => {
      const decididas = v.ganadas + v.perdidas;
      return {
        estrategia,
        label: estrategia === "sin_estrategia" ? "Sin estrategia" : ESTRATEGIA_LABEL[estrategia] ?? estrategia,
        cuenta: v.cuenta,
        valor: v.valor,
        ganadas: v.ganadas,
        perdidas: v.perdidas,
        tasa_cierre: decididas > 0 ? Math.round((v.ganadas / decididas) * 100) : null,
      };
    })
    .sort((a, b) => b.valor - a.valor);
}
