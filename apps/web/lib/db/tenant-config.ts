import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export type TenantConfig = {
  rfm?: { oro: number; plata: number };
  tipo_cambio?: { moneda: string; valor: number };
};

export const RFM_DEFAULT = { oro: 5000, plata: 1500 };

export async function getTenantConfig(): Promise<TenantConfig> {
  try {
    const u = await getSessionUser();
    if (!u?.tenantId) return {};
    const admin = createAdminSupabase();
    const { data } = await admin.from("tenant").select("config").eq("id", u.tenantId).maybeSingle();
    return ((data?.config as TenantConfig) ?? {}) as TenantConfig;
  } catch {
    return {};
  }
}

export async function setTenantConfig(patch: TenantConfig): Promise<void> {
  const u = await getSessionUser();
  if (u?.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  const admin = createAdminSupabase();
  const { data } = await admin.from("tenant").select("config").eq("id", u.tenantId).maybeSingle();
  const merged = { ...((data?.config as TenantConfig) ?? {}), ...patch };
  const { error } = await admin.from("tenant").update({ config: merged }).eq("id", u.tenantId);
  if (error) throw new Error(error.message);
}
