/** Commission roles — client-safe (no server imports). */

export type RolComercial = "counter_jr" | "counter_sr" | "vendedor_externo" | "gerente";

export const ROLES_COMERCIALES: { key: RolComercial; label: string }[] = [
  { key: "counter_jr", label: "Counter Jr" },
  { key: "counter_sr", label: "Counter Sr" },
  { key: "vendedor_externo", label: "Vendedor externo" },
  { key: "gerente", label: "Gerente" },
];

export type ComisionAsesor = {
  id: string;
  nombre: string;
  rol_comercial: RolComercial | null;
  comision_pct: number;
  meta_mensual: number | null;
  ventas: number;
  cuenta: number;
  cumplimiento_pct: number | null;
  comision: number;
  moneda: string;
};
