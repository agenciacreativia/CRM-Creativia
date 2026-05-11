import { z } from "zod";

export const planSchema = z.enum(["starter", "professional", "enterprise"]);
export const tenantEstadoSchema = z.enum(["activo", "suspendido", "cancelado"]);

export const subdomainSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/, "Subdominio inválido");

export const tenantSchema = z.object({
  id: z.string().uuid(),
  nombre_empresa: z.string().min(1).max(120),
  subdominio: subdomainSchema,
  plan: planSchema,
  estado: tenantEstadoSchema,
  admin_email: z.string().email(),
});

export type Tenant = z.infer<typeof tenantSchema>;
