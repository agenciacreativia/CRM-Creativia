import { z } from "zod";

// Reusable: every entity is scoped to a tenant
export const tenantScoped = z.object({
  tenant_id: z.string().uuid(),
});

// ---- empresa ----
export const empresaOrigenSchema = z.enum([
  "web", "referencia", "cold_call", "evento", "otro",
]);

export const empresaEstadoSchema = z.enum([
  "prospecto", "cliente", "inactivo",
]);

export const empresaInputSchema = z.object({
  nombre: z.string().min(1).max(200),
  origen: empresaOrigenSchema.optional(),
  telefono: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  sitio_web: z.string().url().optional().or(z.literal("")),
  pais: z.string().max(80).optional(),
  ciudad: z.string().max(80).optional(),
  descripcion: z.string().max(5000).optional(),
  estado_empresa: empresaEstadoSchema.default("prospecto"),
  campos_custom: z.record(z.unknown()).default({}),
});

export type EmpresaInput = z.infer<typeof empresaInputSchema>;

// ---- contacto ----
export const contactoOrigenSchema = z.enum([
  "empresa", "linkedin", "cold_call", "evento", "otro",
]);

export const contactoInputSchema = z.object({
  empresa_id: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  cargo: z.string().max(120).optional(),
  email: z.string().email(),
  telefono: z.string().max(40).optional(),
  telefono_whatsapp: z.string().max(40).optional(),
  origen: contactoOrigenSchema.optional(),
  descripcion: z.string().max(5000).optional(),
  campos_custom: z.record(z.unknown()).default({}),
});

export type ContactoInput = z.infer<typeof contactoInputSchema>;

// ---- oportunidad ----
export const oportunidadEstadoSchema = z.enum([
  "activo", "ganado", "perdido", "eliminado",
]);

export const monedaSchema = z.enum([
  "USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL",
]);

export const oportunidadInputSchema = z.object({
  empresa_id: z.string().uuid(),
  contacto_id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
  etapa_id: z.string().uuid(),
  asignado_id: z.string().uuid().optional(),
  nombre: z.string().min(1).max(200),
  valor: z.number().nonnegative().optional(),
  moneda: monedaSchema.default("USD"),
  estado: oportunidadEstadoSchema.default("activo"),
  probabilidad_cierre: z.number().int().min(0).max(100).optional(),
  fecha_esperada_cierre: z.string().date().optional(),
  motivo_perdida_id: z.string().uuid().optional(),
  observaciones_perdida: z.string().max(2000).optional(),
  descripcion: z.string().max(5000).optional(),
  campos_custom: z.record(z.unknown()).default({}),
});

export type OportunidadInput = z.infer<typeof oportunidadInputSchema>;

// ---- campo personalizado ----
export const tipoEntidadSchema = z.enum([
  "empresa", "contacto", "oportunidad",
]);

export const tipoCampoSchema = z.enum([
  "texto", "numero", "moneda", "fecha", "seleccion", "checkbox", "textarea",
]);

export const campoPersonalizadoInputSchema = z.object({
  tipo_entidad: tipoEntidadSchema,
  clave: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
  etiqueta: z.string().min(1).max(120),
  etiqueta_en: z.string().max(120).optional(),
  tipo: tipoCampoSchema,
  opciones: z.array(z.string()).optional(),
  requerido: z.boolean().default(false),
  orden: z.number().int().nonnegative().default(0),
});

export type CampoPersonalizadoInput = z.infer<typeof campoPersonalizadoInputSchema>;
