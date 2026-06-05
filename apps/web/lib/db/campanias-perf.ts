import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type CampaniaPerf = {
  source: string;
  medium: string;
  campaign: string;
  oportunidades: number;
  ganadas: number;
  valor: number;
  tasa: number | null;
};

export type UtmOptions = {
  sources: string[];
  mediums: string[];
  campaigns: string[];
  contents: string[];
  terms: string[];
};

/** Devuelve agregados por (source/medium/campaign) de oportunidades. */
export async function getCampaniasPerf(): Promise<CampaniaPerf[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("oportunidad")
      .select("utm_source, utm_medium, utm_campaign, estado, valor")
      .neq("estado", "eliminado");
    const map = new Map<string, { oportunidades: number; ganadas: number; valor: number }>();
    for (const o of (data ?? []) as { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; estado: string; valor: number | null }[]) {
      const key = `${o.utm_source ?? "—"}|${o.utm_medium ?? "—"}|${o.utm_campaign ?? "—"}`;
      const cur = map.get(key) ?? { oportunidades: 0, ganadas: 0, valor: 0 };
      cur.oportunidades += 1;
      if (o.estado === "ganado") {
        cur.ganadas += 1;
        cur.valor += o.valor ?? 0;
      }
      map.set(key, cur);
    }
    return [...map.entries()].map(([k, v]) => {
      const [source, medium, campaign] = k.split("|");
      return { source, medium, campaign, ...v, tasa: v.oportunidades > 0 ? Math.round((v.ganadas / v.oportunidades) * 100) : null };
    }).sort((a, b) => b.valor - a.valor);
  } catch {
    return [];
  }
}

/** Valores únicos de UTM existentes (para autocompletar). */
export async function getUtmOptions(): Promise<UtmOptions> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("oportunidad")
      .select("utm_source, utm_medium, utm_campaign, utm_content, utm_term")
      .limit(5000);
    const sources = new Set<string>(), mediums = new Set<string>(), campaigns = new Set<string>(), contents = new Set<string>(), terms = new Set<string>();
    for (const o of (data ?? []) as Record<string, string | null>[]) {
      if (o.utm_source) sources.add(o.utm_source);
      if (o.utm_medium) mediums.add(o.utm_medium);
      if (o.utm_campaign) campaigns.add(o.utm_campaign);
      if (o.utm_content) contents.add(o.utm_content);
      if (o.utm_term) terms.add(o.utm_term);
    }
    return {
      sources: [...sources].sort(),
      mediums: [...mediums].sort(),
      campaigns: [...campaigns].sort(),
      contents: [...contents].sort(),
      terms: [...terms].sort(),
    };
  } catch {
    return { sources: [], mediums: [], campaigns: [], contents: [], terms: [] };
  }
}
