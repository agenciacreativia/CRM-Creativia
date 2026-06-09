"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActividad, toggleActividad, deleteActividad, logCambio } from "@/lib/db/mutations";
import { getValidAccessToken, getCalendarSyncEnabled } from "@/lib/db/google";
import { getSessionUser } from "@/lib/auth";
import { createCalendarEvent } from "@/lib/google/calendar";

const TIPO_LABEL: Record<string, string> = {
  llamada: "Llamada",
  email: "Correo",
  whatsapp: "WhatsApp",
  reunion: "Reunión",
  otra: "Actividad",
};

const DEFAULT_TZ = "America/Bogota";

/** Add one hour to a "YYYY-MM-DDTHH:mm" wall-clock string (no tz drift). */
function plusOneHour(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return local;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  d.setUTCHours(d.getUTCHours() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Push a scheduled CRM activity to the user's Google Calendar (best-effort). */
async function syncActividadToCalendar(
  tipo: string,
  descripcion: string | null,
  fecha: string | null,
  completada: boolean,
) {
  if (!fecha || completada) return; // only future/scheduled, not already-done
  try {
    const user = await getSessionUser();
    if (!user) return;
    if (!(await getCalendarSyncEnabled(user.id))) return; // user disabled the sync
    const token = await getValidAccessToken(user.id);
    if (!token) return;
    const label = TIPO_LABEL[tipo] ?? "Actividad";
    await createCalendarEvent(token, {
      summary: descripcion ? `${label}: ${descripcion}` : label,
      startLocal: fecha,
      endLocal: plusOneHour(fecha),
      timeZone: DEFAULT_TZ,
      addMeet: tipo === "reunion", // video link for meetings
    });
  } catch {
    /* the activity was saved — don't fail over the calendar sync */
  }
}

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const schema = z.object({
  oportunidad_id: z.string().uuid(),
  tipo: z.enum(["llamada", "email", "whatsapp", "reunion", "otra"]),
  descripcion: z.preprocess(emptyToNull, z.string().max(2000).nullable()),
  fecha_programada: z.preprocess(emptyToNull, z.string().nullable()),
  completada: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()),
});

type Result = { ok: true } | { ok: false; error: string };

/** Mapea errores internos de Supabase/DB a mensajes amigables, sin filtrar detalles. */
function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message.toLowerCase() : "";
  if (!raw) return "Error";
  if (raw.includes("unique") || raw.includes("duplicate") || raw.includes("duplicated")) {
    return "Ya existe un registro con esos datos";
  }
  if (raw.includes("permission") || raw.includes("rls") || raw.includes("not authorized")) {
    return "No tienes permiso para realizar esta acción";
  }
  if (raw.includes("foreign key") || raw.includes("violates")) {
    return "Datos inválidos o referencia inexistente";
  }
  if (raw.includes("not found")) return "Recurso no encontrado";
  if (raw.includes("network") || raw.includes("fetch")) return "Error de conexión";
  return "No se pudo completar la operación";
}

export async function createActividadAction(formData: FormData): Promise<Result> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await createActividad(parsed.data);
    await logCambio(
      "oportunidad",
      parsed.data.oportunidad_id,
      `Agregó actividad: ${TIPO_LABEL[parsed.data.tipo] ?? "Actividad"}`,
    );
    await syncActividadToCalendar(
      parsed.data.tipo,
      parsed.data.descripcion,
      parsed.data.fecha_programada,
      parsed.data.completada,
    );
    revalidatePath(`/oportunidades/${parsed.data.oportunidad_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function toggleActividadAction(id: string, completada: boolean): Promise<Result> {
  try {
    await toggleActividad(id, completada);
    revalidatePath("/oportunidades");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function deleteActividadAction(id: string): Promise<Result> {
  try {
    await deleteActividad(id);
    revalidatePath("/oportunidades");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
