"use server";

import { z } from "zod";
import { acceptInvitacion } from "@/lib/db/invitaciones";

const schema = z.object({
  token: z.string().min(10),
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

export async function acceptInvitacionAction(
  payload: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  return acceptInvitacion(parsed.data);
}
