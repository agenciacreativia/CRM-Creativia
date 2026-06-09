import "server-only";
import crypto from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export type ApiKey = {
  id: string; nombre: string; prefijo: string; ultimo_uso: string | null; creada_en: string; revocada: boolean;
  limite_mes: number | null; usados_mes: number;
};

const DEFAULT_LIMITE_MES = 10000;

async function ensureAdmin() {
  const u = await getSessionUser();
  if (u?.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

function hash(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function listApiKeys(): Promise<ApiKey[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("api_key")
      .select("id, nombre, prefijo, ultimo_uso, creada_en, revocada, limite_mes, usados_mes, mes_actual")
      .order("creada_en", { ascending: false });
    const ahoraMes = new Date().toISOString().slice(0, 7);
    return ((data ?? []) as (ApiKey & { mes_actual?: string | null })[]).map((k) => ({
      ...k,
      limite_mes: k.limite_mes ?? DEFAULT_LIMITE_MES,
      usados_mes: k.mes_actual === ahoraMes ? (k.usados_mes ?? 0) : 0,
    }));
  } catch {
    return [];
  }
}

/** Create + return the PLAIN key once (it's never stored in plain). */
export async function createApiKey(nombre: string): Promise<{ id: string; key: string; prefijo: string }> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  // Solo una API key activa por cuenta — filtrado explícito por tenant_id por defensa en profundidad.
  const { data: existentes } = await supabase
    .from("api_key")
    .select("id")
    .eq("tenant_id", caller.tenantId)
    .eq("revocada", false);
  if ((existentes?.length ?? 0) > 0) {
    throw new Error("Ya tenés una API key activa. Revocá la actual antes de crear otra (1 sola key activa por cuenta).");
  }
  const key = "crm_" + crypto.randomBytes(28).toString("hex");
  const prefijo = key.slice(0, 12);
  const { data, error } = await supabase
    .from("api_key")
    .insert({
      tenant_id: caller.tenantId,
      nombre, prefijo, hash: hash(key), creada_por: caller.id,
      limite_mes: DEFAULT_LIMITE_MES,
      usados_mes: 0,
      mes_actual: new Date().toISOString().slice(0, 7),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, key, prefijo };
}

export async function revocarApiKey(id: string): Promise<void> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("api_key").update({ revocada: true }).eq("id", id).eq("tenant_id", caller.tenantId);
  if (error) throw new Error(error.message);
}

/**
 * Resuelve API key → tenant + check de límite mensual.
 * Devuelve `{ tenantId, exceeded }`: si `exceeded` es true, el endpoint debe
 * desviar los leads a la lista de espera en lugar de procesarlos.
 */
export async function authenticateApiKey(rawKey: string): Promise<{
  tenantId: string; keyId: string; exceeded: boolean; usados: number; limite: number;
} | null> {
  try {
    if (!rawKey || !rawKey.startsWith("crm_")) return null;
    const admin = createAdminSupabase();
    const h = hash(rawKey);
    const { data } = await admin
      .from("api_key")
      .select("id, tenant_id, revocada, limite_mes, usados_mes, mes_actual")
      .eq("hash", h)
      .maybeSingle();
    if (!data || data.revocada) return null;
    const mesActual = new Date().toISOString().slice(0, 7);
    const limite = data.limite_mes ?? DEFAULT_LIMITE_MES;
    // Reset al cambio de mes: ponemos usados_mes=1 directamente vía conditional update.
    if (data.mes_actual !== mesActual) {
      await admin.from("api_key").update({
        ultimo_uso: new Date().toISOString(),
        usados_mes: 1,
        mes_actual: mesActual,
      }).eq("id", data.id);
      return {
        tenantId: data.tenant_id as string,
        keyId: data.id as string,
        exceeded: 1 > limite,
        usados: 1, limite,
      };
    }
    // Increment atómico vía RPC para evitar race. Si la RPC no existe, hacemos
    // best-effort UPDATE con .returns para conocer el valor real post-update.
    const { data: incData, error: incErr } = await admin.rpc("incrementar_uso_api_key", { p_key_id: data.id }).single<{ usados_mes: number }>();
    let usados = data.usados_mes ?? 0;
    if (!incErr && incData && typeof incData.usados_mes === "number") {
      usados = incData.usados_mes;
    } else {
      // Fallback: increment via select-update con timestamp para deshacer race parcialmente.
      usados = (data.usados_mes ?? 0) + 1;
      await admin.from("api_key").update({
        ultimo_uso: new Date().toISOString(),
        usados_mes: usados,
        mes_actual: mesActual,
      }).eq("id", data.id);
    }
    return {
      tenantId: data.tenant_id as string,
      keyId: data.id as string,
      exceeded: usados > limite,
      usados, limite,
    };
  } catch {
    return null;
  }
}

/** Compat: viejo helper que sólo devolvía el tenantId. */
export async function tenantIdFromApiKey(rawKey: string): Promise<string | null> {
  const r = await authenticateApiKey(rawKey);
  return r?.tenantId ?? null;
}
