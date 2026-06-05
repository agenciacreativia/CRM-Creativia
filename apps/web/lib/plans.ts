/**
 * Platform plan model — client-safe (no server-only imports).
 *
 * A plan declares MODULES (with CRUD actions, same shape as role permisos)
 * and TOOLS (feature flags). Tenants subscribe to a plan; it's the ceiling
 * of what their roles can grant.
 */

import { PERMISSION_MODULES, PERMISSION_ACTIONS, type ModuleKey, type ModulePerms } from "@/lib/permissions";

export { PERMISSION_MODULES as PLAN_MODULES, PERMISSION_ACTIONS as PLAN_ACTIONS };
export type { ModuleKey, ModulePerms };

export type PlanModulos = Record<ModuleKey, ModulePerms>;

/** Feature flags a plan can switch on/off, grouped for the UI. */
export const HERRAMIENTAS = [
  { key: "google_integracion", label: "Integración con Google", desc: "Conectar Gmail, Calendar y Tareas", grupo: "Comunicación" },
  { key: "plantillas_correo", label: "Plantillas de correo", desc: "Plantillas reutilizables con variables", grupo: "Comunicación" },
  { key: "calendar_sync", label: "Sincronizar con Calendar", desc: "Volcar actividades del CRM al calendario", grupo: "Comunicación" },
  { key: "meet", label: "Reuniones con Google Meet", desc: "Generar enlaces de videollamada", grupo: "Comunicación" },
  { key: "cotizaciones", label: "Cotizaciones", desc: "Armar y enviar cotizaciones imprimibles", grupo: "Ventas" },
  { key: "productos", label: "Catálogo de productos", desc: "Módulo de planes/servicios", grupo: "Ventas" },
  { key: "productos_oportunidad", label: "Productos en oportunidad", desc: "Asociar productos al negocio", grupo: "Ventas" },
  { key: "documentos", label: "Documentos adjuntos", desc: "Subir archivos a registros", grupo: "Datos" },
  { key: "campos_personalizados", label: "Campos personalizados", desc: "Definir campos propios", grupo: "Datos" },
  { key: "importar_datos", label: "Importar datos", desc: "Carga masiva desde Excel/CSV", grupo: "Datos" },
  { key: "exportar_datos", label: "Exportar datos", desc: "Descargar datos en CSV/JSON", grupo: "Datos" },
  { key: "roles_permisos", label: "Roles y permisos", desc: "Crear roles con permisos por módulo", grupo: "Administración" },
  { key: "multiples_pipelines", label: "Múltiples embudos", desc: "Más de un pipeline de ventas", grupo: "Administración" },
] as const;

export type HerramientaKey = (typeof HERRAMIENTAS)[number]["key"];
export type PlanHerramientas = Partial<Record<HerramientaKey, boolean>>;

export const HERRAMIENTA_GRUPOS = ["Comunicación", "Ventas", "Datos", "Administración"] as const;

export const LIMITES = [
  { key: "max_usuarios", label: "Usuarios" },
  { key: "max_empresas", label: "Empresas" },
  { key: "max_contactos", label: "Contactos" },
  { key: "max_oportunidades", label: "Oportunidades" },
  { key: "max_productos", label: "Productos" },
  { key: "max_campos_personalizados", label: "Campos personalizados" },
] as const;

export type LimiteKey = (typeof LIMITES)[number]["key"];
export type PlanLimites = Partial<Record<LimiteKey, number | null>>;

/** A fully-false module matrix. */
export function emptyModulos(): PlanModulos {
  const out = {} as PlanModulos;
  for (const m of PERMISSION_MODULES) out[m.key] = { ver: false, crear: false, editar: false, eliminar: false };
  return out;
}

export function normalizeModulos(raw: Partial<PlanModulos> | null | undefined): PlanModulos {
  const base = emptyModulos();
  if (!raw) return base;
  for (const m of PERMISSION_MODULES) {
    const r = raw[m.key];
    if (r) base[m.key] = { ver: !!r.ver, crear: !!r.crear, editar: !!r.editar, eliminar: !!r.eliminar };
  }
  return base;
}

export function normalizeHerramientas(raw: PlanHerramientas | null | undefined): Record<HerramientaKey, boolean> {
  const out = {} as Record<HerramientaKey, boolean>;
  for (const h of HERRAMIENTAS) out[h.key] = !!raw?.[h.key];
  return out;
}

/** Does a plan include a tool? */
export function planTiene(herramientas: PlanHerramientas | null | undefined, key: HerramientaKey): boolean {
  return !!herramientas?.[key];
}

/** Count enabled modules (with at least "ver") and tools — for plan cards. */
export function contarModulos(m: PlanModulos): number {
  return PERMISSION_MODULES.filter((mod) => m[mod.key]?.ver).length;
}
export function contarHerramientas(h: PlanHerramientas): number {
  return HERRAMIENTAS.filter((x) => h[x.key]).length;
}
