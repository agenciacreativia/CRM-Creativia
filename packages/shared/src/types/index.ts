/**
 * Database row types — mirror columns from supabase/migrations/*.sql
 * Keep in sync manually until we add a SQL-to-TS generator.
 */

export type UUID = string;

export interface TenantRow {
  id: UUID;
  nombre_empresa: string;
  subdominio: string;
  plan: "starter" | "professional" | "enterprise";
  estado: "activo" | "suspendido" | "cancelado";
  admin_email: string;
  creado_en: string;
  actualizado_en: string;
  ultimo_acceso: string | null;
}

export interface UsuarioRow {
  id: UUID;
  tenant_id: UUID;
  nombre: string;
  email: string;
  rol: "admin" | "asesor";
  activo: boolean;
  idioma_preferido: "es" | "en";
  creado_en: string;
  actualizado_en: string;
  ultimo_acceso: string | null;
}

export interface EmpresaRow {
  id: UUID;
  tenant_id: UUID;
  nombre: string;
  origen: string | null;
  telefono: string | null;
  email: string | null;
  sitio_web: string | null;
  pais: string | null;
  ciudad: string | null;
  descripcion: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  campos_custom: Record<string, unknown>;
  creado_por: UUID | null;
  creado_en: string;
  actualizado_en: string;
}

export interface ContactoRow {
  id: UUID;
  tenant_id: UUID;
  empresa_id: UUID;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  origen: string | null;
  descripcion: string | null;
  campos_custom: Record<string, unknown>;
  creado_por: UUID | null;
  creado_en: string;
  actualizado_en: string;
}

export interface OportunidadRow {
  id: UUID;
  tenant_id: UUID;
  empresa_id: UUID;
  contacto_id: UUID;
  pipeline_id: UUID;
  etapa_id: UUID;
  asignado_id: UUID | null;
  motivo_perdida_id: UUID | null;
  nombre: string;
  valor: number | null;
  moneda: string;
  estado: "activo" | "ganado" | "perdido" | "eliminado";
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  fecha_entrado_etapa: string;
  observaciones_perdida: string | null;
  descripcion: string | null;
  campos_custom: Record<string, unknown>;
  creado_en: string;
  actualizado_en: string;
}
