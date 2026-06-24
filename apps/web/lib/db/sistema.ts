import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Specs por tier de Supabase Compute. Capacidad estimada en base a stress tests
 * del 2026-06-23 (ver scripts/load-test/stress_caps.py).
 */
export type ComputeTier = "micro" | "small" | "medium" | "large" | "xl";

export type TierSpec = {
  id: ComputeTier;
  nombre: string;
  ramGb: number;
  cpuCores: number;
  precioMesUsd: number;
  conexionesAprox: number;
  rpsSostenido: number;
  agenciasActivasMax: number;
  recordsPorTablaMax: number;
};

export const TIERS: Record<ComputeTier, TierSpec> = {
  micro:  { id: "micro",  nombre: "Micro",  ramGb: 1,  cpuCores: 2, precioMesUsd: 10,  conexionesAprox: 15,  rpsSostenido: 5,   agenciasActivasMax: 50,   recordsPorTablaMax: 5_000 },
  small:  { id: "small",  nombre: "Small",  ramGb: 2,  cpuCores: 2, precioMesUsd: 15,  conexionesAprox: 30,  rpsSostenido: 12,  agenciasActivasMax: 100,  recordsPorTablaMax: 15_000 },
  medium: { id: "medium", nombre: "Medium", ramGb: 4,  cpuCores: 2, precioMesUsd: 60,  conexionesAprox: 60,  rpsSostenido: 40,  agenciasActivasMax: 300,  recordsPorTablaMax: 50_000 },
  large:  { id: "large",  nombre: "Large",  ramGb: 8,  cpuCores: 2, precioMesUsd: 110, conexionesAprox: 100, rpsSostenido: 100, agenciasActivasMax: 600,  recordsPorTablaMax: 150_000 },
  xl:     { id: "xl",     nombre: "XL",     ramGb: 16, cpuCores: 4, precioMesUsd: 210, conexionesAprox: 200, rpsSostenido: 200, agenciasActivasMax: 1500, recordsPorTablaMax: 500_000 },
};

/** El tier actual se lee de env. Default small (lo que tenemos hoy). */
export function getCurrentTier(): TierSpec {
  const raw = (process.env.SUPABASE_COMPUTE_TIER ?? "small").toLowerCase();
  return TIERS[(raw as ComputeTier)] ?? TIERS.small;
}

export type UsoGlobal = {
  tenants: number;
  tenantsActivos: number;
  oportunidades: number;
  contactos: number;
  empresas: number;
  productos: number;
  usuarios: number;
};

/**
 * Conteos globales cross-tenant. Usa service-role para sortear RLS.
 * Sólo invocar desde rutas de super-admin.
 */
export async function getUsoGlobal(): Promise<UsoGlobal> {
  const admin = createAdminSupabase();
  const tablas = ["tenant", "oportunidad", "contacto", "empresa", "producto", "usuario"] as const;
  const counts = await Promise.all(
    tablas.map(async (t) => {
      const { count } = await admin.from(t).select("id", { count: "exact", head: true });
      return [t, count ?? 0] as const;
    }),
  );
  const map = Object.fromEntries(counts) as Record<(typeof tablas)[number], number>;

  // Tenants activos: que tengan al menos 1 oportunidad creada en los últimos 30 días
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: activos } = await admin
    .from("oportunidad")
    .select("tenant_id", { count: "exact", head: false })
    .gte("creado_en", desde)
    .limit(10_000);
  const tenantsActivos = new Set((activos ?? []).map((r) => r.tenant_id as string)).size;

  return {
    tenants: map.tenant,
    tenantsActivos,
    oportunidades: map.oportunidad,
    contactos: map.contacto,
    empresas: map.empresa,
    productos: map.producto,
    usuarios: map.usuario,
  };
}

export type SaludDB = {
  pingMs: number;
  countOportunidadMs: number;
  ok: boolean;
};

/** Mide latencia de queries simples a la BD para sentir la salud actual. */
export async function getSaludDB(): Promise<SaludDB> {
  const admin = createAdminSupabase();
  const t1 = performance.now();
  const ping = await admin.from("tenant").select("id", { count: "exact", head: true });
  const pingMs = Math.round(performance.now() - t1);

  const t2 = performance.now();
  const cnt = await admin.from("oportunidad").select("id", { count: "exact", head: true });
  const countOportunidadMs = Math.round(performance.now() - t2);

  return { pingMs, countOportunidadMs, ok: !ping.error && !cnt.error };
}

export type Capacidad = {
  dimension: string;
  valorActual: number;
  techo: number;
  porcentaje: number;
  recomendacion: "ok" | "atento" | "upgrade";
};

export function calcularCapacidad(uso: UsoGlobal, tier: TierSpec): Capacidad[] {
  const techoRecords = tier.recordsPorTablaMax;
  const tablas = [
    { dim: "Oportunidades", v: uso.oportunidades },
    { dim: "Contactos", v: uso.contactos },
    { dim: "Empresas", v: uso.empresas },
    { dim: "Productos", v: uso.productos },
  ];
  const items: Capacidad[] = tablas.map((t) => {
    const pct = Math.round((t.v / techoRecords) * 100);
    return {
      dimension: t.dim,
      valorActual: t.v,
      techo: techoRecords,
      porcentaje: pct,
      recomendacion: pct >= 80 ? "upgrade" : pct >= 60 ? "atento" : "ok",
    };
  });

  const pctAg = Math.round((uso.tenantsActivos / tier.agenciasActivasMax) * 100);
  items.unshift({
    dimension: "Agencias activas (últimos 30 días)",
    valorActual: uso.tenantsActivos,
    techo: tier.agenciasActivasMax,
    porcentaje: pctAg,
    recomendacion: pctAg >= 80 ? "upgrade" : pctAg >= 60 ? "atento" : "ok",
  });

  return items;
}

/** El siguiente tier (sólo si existe) para sugerir upgrade. */
export function nextTier(actual: TierSpec): TierSpec | null {
  const orden: ComputeTier[] = ["micro", "small", "medium", "large", "xl"];
  const idx = orden.indexOf(actual.id);
  if (idx === -1 || idx === orden.length - 1) return null;
  return TIERS[orden[idx + 1]];
}
