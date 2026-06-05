import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getTenantConfig, RFM_DEFAULT, type TenantConfig } from "@/lib/db/tenant-config";

export type NivelViajero = "oro" | "plata" | "bronce";

export const NIVEL_LABEL: Record<NivelViajero, string> = { oro: "Oro", plata: "Plata", bronce: "Bronce" };

export function nivelPorMonto(monto: number, cfg: TenantConfig): NivelViajero {
  const oro = cfg.rfm?.oro ?? RFM_DEFAULT.oro;
  const plata = cfg.rfm?.plata ?? RFM_DEFAULT.plata;
  return monto >= oro ? "oro" : monto >= plata ? "plata" : "bronce";
}

/** Traveler tier for one contact, from the sum of its won opportunities. */
export async function nivelDeContacto(contactoId: string): Promise<{ nivel: NivelViajero; monto: number; moneda: string }> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("oportunidad")
    .select("valor, moneda")
    .eq("contacto_id", contactoId)
    .eq("estado", "ganado");
  const monto = (data ?? []).reduce((s, o) => s + ((o.valor as number) ?? 0), 0);
  const moneda = (data ?? [])[0]?.moneda ?? "USD";
  const cfg = await getTenantConfig();
  return { nivel: nivelPorMonto(monto, cfg), monto, moneda };
}
