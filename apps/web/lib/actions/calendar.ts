"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMyAccessToken } from "@/lib/db/google";
import { createCalendarEvent } from "@/lib/google/calendar";
import { createActividad, logCambio } from "@/lib/db/mutations";

export type EventResult = {
  ok: boolean;
  error?: string;
  needsConnect?: boolean;
  link?: string | null;
  meetLink?: string | null;
};

const DEFAULT_TZ = "America/Bogota";

const schema = z.object({
  oportunidad_id: z.string().uuid(),
  titulo: z.string().trim().min(1, "Título requerido").max(300),
  inicio: z.string().min(1, "Fecha de inicio requerida"),
  fin: z.string().min(1, "Fecha de fin requerida"),
  descripcion: z.string().max(5000).optional().default(""),
  invitado: z.string().trim().email().optional().or(z.literal("")),
  meet: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()).optional(),
});

export async function createOportunidadEventoAction(formData: FormData): Promise<EventResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { oportunidad_id, titulo, inicio, fin, descripcion, invitado, meet } = parsed.data;

  if (new Date(fin).getTime() <= new Date(inicio).getTime()) {
    return { ok: false, error: "La hora de fin debe ser posterior al inicio." };
  }

  const accessToken = await getMyAccessToken();
  if (!accessToken) {
    return { ok: false, needsConnect: true, error: "Conectá tu Gmail/Calendar en Ajustes." };
  }

  let link: string | null = null;
  let meetLink: string | null = null;
  try {
    const out = await createCalendarEvent(accessToken, {
      summary: titulo,
      description: descripcion || undefined,
      startLocal: inicio,
      endLocal: fin,
      timeZone: DEFAULT_TZ,
      attendees: invitado ? [invitado] : undefined,
      addMeet: meet ?? false,
    });
    link = out.htmlLink;
    meetLink = out.meetLink;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear el evento" };
  }

  try {
    await createActividad({
      oportunidad_id,
      tipo: "reunion",
      descripcion: meetLink ? `${titulo} · Meet: ${meetLink}` : titulo,
      fecha_programada: inicio,
      completada: false,
    });
    await logCambio("oportunidad", oportunidad_id, `Agendó una reunión: ${titulo}`);
  } catch {
    /* event created — don't fail over logging */
  }

  revalidatePath(`/oportunidades/${oportunidad_id}`);
  return { ok: true, link, meetLink };
}
