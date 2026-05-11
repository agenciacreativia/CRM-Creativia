import { z } from "zod";

export const rolSchema = z.enum(["admin", "asesor"]);
export const localeSchema = z.enum(["es", "en"]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const usuarioSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  nombre: z.string().min(1).max(120),
  email: z.string().email(),
  rol: rolSchema,
  activo: z.boolean(),
  idioma_preferido: localeSchema,
});

export type Rol = z.infer<typeof rolSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Usuario = z.infer<typeof usuarioSchema>;
