import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getTenantConfig, RFM_DEFAULT, type TenantConfig } from "@/lib/db/tenant-config";

export type NivelViajero = "oro" | "plata" | "bronce";

export const NIVEL_LABEL: Record<NivelViajero, string> = { oro: "Oro", plata: "Plata", bronce: "Bronce" };

// Nota: se espera que cfg.rfm.oro >= cfg.rfm.plata. La validación de esa
// invariante debe hacerse al persistir la configuración del tenant; aquí
// asumimos thresholds coherentes para no encarecer cada cálculo.
export function nivelPorMonto(monto: number, cfg: TenantConfig): NivelViajero {
  const oro = cfg.rfm?.oro ?? RFM_DEFAULT.oro;
  const plata = cfg.rfm?.plata ?? RFM_DEFAULT.plata;
  return monto >= oro ? "oro" : monto >= plata ? "plata" : "bronce";
}

/** Traveler tier for one contact, from the sum of its won opportunities. */
export async function nivelDeContacto(contactoId: string): Promise<{ nivel: NivelViajero; monto: number; moneda: string }> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad")
    .select("valor, moneda")
    .eq("contacto_id", contactoId)
    .eq("estado", "ganado");
  const cfg = await getTenantConfig();
  if (error) {
    // Defensive: si la query falla (RLS, conexión, etc.) devolvemos bronce
    // en vez de inflar el nivel del contacto con un monto 0.
    return { nivel: "bronce", monto: 0, moneda: "USD" };
  }
  const monto = (data ?? []).reduce((s, o) => {
    // Validamos que valor sea un número finito; protege contra strings o NaN
    // que podrían colarse pese a los constraints de la DB.
    const v = typeof o.valor === "number" && Number.isFinite(o.valor) ? o.valor : 0;
    return s + v;
  }, 0);
  const moneda = (data ?? [])[0]?.moneda ?? "USD";
  return { nivel: nivelPorMonto(monto, cfg), monto, moneda };
}
