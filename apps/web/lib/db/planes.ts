import "server-only";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import {
  normalizeModulos,
  normalizeHerramientas,
  type PlanModulos,
  type PlanHerramientas,
  type PlanLimites,
} from "@/lib/plans";

export type Plan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  periodicidad: "mensual" | "anual" | "unico";
  modulos: PlanModulos;
  herramientas: Record<string, boolean>;
  limites: PlanLimites;
  activo: boolean;
  orden: number;
};

const COLS = "id, nombre, descripcion, precio, moneda, periodicidad, modulos, herramientas, limites, activo, orden";

/** Whether the current user is an admin of the platform-owner tenant. */
export async function isPlatformAdmin(): Promise<boolean> {
  const u = await getSessionUser();
  if (!u || u.rol !== "admin" || !u.tenantId) return false;
  const admin = createAdminSupabase();
  const { data } = await admin.from("tenant").select("es_plataforma").eq("id", u.tenantId).maybeSingle();
  return !!data?.es_plataforma;
}

async function ensurePlatformAdmin() {
  if (!(await isPlatformAdmin())) throw new Error("Solo la plataforma puede gestionar planes");
}

function mapPlan(r: Record<string, unknown>): Plan {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    descripcion: (r.descripcion as string | null) ?? null,
    precio: Number(r.precio) || 0,
    moneda: (r.moneda as string) ?? "USD",
    periodicidad: (r.periodicidad as Plan["periodicidad"]) ?? "mensual",
    modulos: normalizeModulos(r.modulos as Partial<PlanModulos> | null),
    herramientas: normalizeHerramientas(r.herramientas as PlanHerramientas | null),
    limites: (r.limites as PlanLimites) ?? {},
    activo: !!r.activo,
    orden: Number(r.orden) || 0,
  };
}

/** List all plans (platform catalog). Defensive: [] if table missing (pre-0020). */
export async function listPlanes(): Promise<Plan[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("plan").select(COLS).order("orden").order("precio");
  if (error) return [];
  return (data ?? []).map(mapPlan);
}

export async function getPlan(id: string): Promise<Plan | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("plan").select(COLS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapPlan(data);
}

export type PlanInput = {
  nombre: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  periodicidad: "mensual" | "anual" | "unico";
  modulos: PlanModulos;
  herramientas: PlanHerramientas;
  limites: PlanLimites;
  activo: boolean;
  orden: number;
};

export async function createPlan(input: PlanInput): Promise<string> {
  await ensurePlatformAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("plan").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updatePlan(id: string, input: PlanInput): Promise<void> {
  await ensurePlatformAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("plan")
    .update({ ...input, actualizado_en: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setPlanActivo(id: string, activo: boolean): Promise<void> {
  await ensurePlatformAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("plan").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePlan(id: string): Promise<void> {
  await ensurePlatformAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("plan").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Assign a plan to a tenant (platform admin). Plan change auto-releases held rows via DB trigger. */
export async function setTenantPlan(tenantId: string, planId: string | null): Promise<void> {
  await ensurePlatformAdmin();
  const admin = createAdminSupabase();
  const { error } = await admin.from("tenant").update({ plan_id: planId }).eq("id", tenantId);
  if (error) throw new Error(error.message);
}

/**
 * The current tenant's plan ceiling. `sinTecho` = no limits (the platform
 * tenant, or a tenant without a plan). Otherwise modulos/herramientas cap
 * what the tenant's roles can grant. Cached per request.
 */
export const getTenantCapabilities = cache(async (): Promise<{
  sinTecho: boolean;
  modulos?: PlanModulos;
  herramientas?: Record<string, boolean>;
}> => {
  const u = await getSessionUser();
  if (!u?.tenantId) return { sinTecho: true };
  const admin = createAdminSupabase();
  const { data: tenant } = await admin
    .from("tenant")
    .select("plan_id, es_plataforma")
    .eq("id", u.tenantId)
    .maybeSingle();
  // Platform tenant or no plan → full access.
  if (!tenant || tenant.es_plataforma || !tenant.plan_id) return { sinTecho: true };
  const { data: plan } = await admin
    .from("plan")
    .select("modulos, herramientas")
    .eq("id", tenant.plan_id)
    .maybeSingle();
  if (!plan) return { sinTecho: true };
  return {
    sinTecho: false,
    modulos: normalizeModulos(plan.modulos as Partial<PlanModulos> | null),
    herramientas: normalizeHerramientas(plan.herramientas as PlanHerramientas | null),
  };
});

/** Set of tool keys enabled by the tenant's plan. `null` = no ceiling (all enabled). */
export async function getTenantHerramientas(): Promise<Set<string> | null> {
  const cap = await getTenantCapabilities();
  if (cap.sinTecho || !cap.herramientas) return null;
  return new Set(Object.entries(cap.herramientas).filter(([, v]) => v).map(([k]) => k));
}

/** Does the tenant's plan include a given tool? */
export async function tenantTieneHerramienta(key: string): Promise<boolean> {
  const set = await getTenantHerramientas();
  return set === null || set.has(key);
}

export type ListaEsperaResumen = { total: number; items: { tipo: string; label: string; count: number }[] };

/**
 * Held-record summary for the current tenant. Returns null if the tenant has
 * no plan (nothing can be capped). Defensive: null if columns missing (pre-0021).
 */
export async function getListaEsperaResumen(): Promise<ListaEsperaResumen | null> {
  try {
    const u = await getSessionUser();
    if (!u?.tenantId) return null;
    const admin = createAdminSupabase();
    const { data: tenant } = await admin.from("tenant").select("plan_id").eq("id", u.tenantId).maybeSingle();
    if (!tenant?.plan_id) return null; // no plan → nothing capped

    const tablas: [string, string][] = [
      ["empresa", "Empresas"],
      ["contacto", "Contactos"],
      ["oportunidad", "Oportunidades"],
      ["producto", "Productos"],
    ];
    const items: { tipo: string; label: string; count: number }[] = [];
    let total = 0;
    for (const [tabla, label] of tablas) {
      const { count } = await admin
        .from(tabla)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", u.tenantId)
        .eq("en_espera", true);
      const c = count ?? 0;
      if (c > 0) items.push({ tipo: tabla, label, count: c });
      total += c;
    }
    return { total, items };
  } catch {
    return null;
  }
}
