"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createApiKey, revocarApiKey } from "@/lib/db/api-keys";
import { createWebhook, deleteWebhook, updateWebhook, EVENTOS_WEBHOOK } from "@/lib/db/webhooks";
import { createReporteProgramado, deleteReporteProgramado } from "@/lib/db/reportes-programados";

export async function crearApiKeyAction(nombre: string): Promise<{ ok: boolean; error?: string; key?: string }> {
  try {
    const r = await createApiKey(nombre.trim() || "Key");
    revalidatePath("/ajustes/integraciones");
    return { ok: true, key: r.key };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}
export async function revocarApiKeyAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try { await revocarApiKey(id); revalidatePath("/ajustes/integraciones"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}

const whSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  url: z.string().trim().url(),
  eventos: z.array(z.enum(EVENTOS_WEBHOOK)).min(1, "Elegí al menos un evento"),
  secret: z.string().trim().max(120).optional().default(""),
});
export async function crearWebhookAction(input: z.input<typeof whSchema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = whSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await createWebhook({ nombre: parsed.data.nombre, url: parsed.data.url, eventos: parsed.data.eventos, secret: parsed.data.secret || null });
    revalidatePath("/ajustes/integraciones");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}
export async function toggleWebhookAction(id: string, activo: boolean): Promise<{ ok: boolean; error?: string }> {
  try { await updateWebhook(id, { activo }); revalidatePath("/ajustes/integraciones"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}
export async function eliminarWebhookAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try { await deleteWebhook(id); revalidatePath("/ajustes/integraciones"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}

const rpSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  destinatarios: z.string().trim().min(1),
  frecuencia: z.enum(["diario", "semanal", "mensual"]),
  activo: z.boolean().default(true),
});
export async function crearReporteProgramadoAction(input: z.input<typeof rpSchema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = rpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await createReporteProgramado({
      nombre: parsed.data.nombre,
      destinatarios: parsed.data.destinatarios.split(/[,\s;]+/).filter(Boolean),
      frecuencia: parsed.data.frecuencia,
      activo: parsed.data.activo,
    });
    revalidatePath("/ajustes/integraciones");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}
export async function eliminarReporteProgramadoAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try { await deleteReporteProgramado(id); revalidatePath("/ajustes/integraciones"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Error" }; }
}
