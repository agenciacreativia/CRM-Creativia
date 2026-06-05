/**
 * Permission model — client-safe (no server-only imports).
 *
 * A role's `permisos` is a map: module -> { ver, crear, editar, eliminar }.
 * `es_admin` roles bypass the map entirely (full access).
 */

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Panel", href: "/dashboard" },
  { key: "empresas", label: "Empresas", href: "/empresas" },
  { key: "contactos", label: "Contactos", href: "/contactos" },
  { key: "oportunidades", label: "Oportunidades", href: "/oportunidades" },
  { key: "productos", label: "Productos", href: "/productos" },
  { key: "agenda", label: "Agenda", href: "/agenda" },
] as const;

export type ModuleKey = (typeof PERMISSION_MODULES)[number]["key"];

export const PERMISSION_ACTIONS = [
  { key: "ver", label: "Ver" },
  { key: "crear", label: "Crear" },
  { key: "editar", label: "Editar" },
  { key: "eliminar", label: "Eliminar" },
] as const;

export type ActionKey = (typeof PERMISSION_ACTIONS)[number]["key"];

export type ModulePerms = Record<ActionKey, boolean>;
export type Permisos = Partial<Record<ModuleKey, Partial<ModulePerms>>>;

/** A fully-false permission matrix for every module. */
export function emptyPermisos(): Record<ModuleKey, ModulePerms> {
  const out = {} as Record<ModuleKey, ModulePerms>;
  for (const m of PERMISSION_MODULES) {
    out[m.key] = { ver: false, crear: false, editar: false, eliminar: false };
  }
  return out;
}

/** Normalize an arbitrary permisos blob into a complete matrix. */
export function normalizePermisos(raw: Permisos | null | undefined): Record<ModuleKey, ModulePerms> {
  const base = emptyPermisos();
  if (!raw) return base;
  for (const m of PERMISSION_MODULES) {
    const r = raw[m.key];
    if (r) {
      base[m.key] = {
        ver: !!r.ver,
        crear: !!r.crear,
        editar: !!r.editar,
        eliminar: !!r.eliminar,
      };
    }
  }
  return base;
}

/** Can this role perform `action` on `mod`? Admin roles always can. */
export function can(
  permisos: Permisos | null | undefined,
  mod: ModuleKey,
  action: ActionKey,
  esAdmin = false,
): boolean {
  if (esAdmin) return true;
  return !!permisos?.[mod]?.[action];
}
