"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { listSalidasExternas, registrarPagoExterno, type SalidaExterna } from "@/lib/db/reservas-externo";
import { crearReservaDesdeOportunidad, cancelarReserva } from "@/lib/db/reservas";
import { getSessionUser } from "@/lib/auth";

const pagoSchema = z.object({
  solicitudId: z.string().min(1),
  oportunidadId: z.string().uuid(),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  moneda: z.string().max(8).default("USD"),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  metodo: z.string().trim().min(1, "Indicá el método"),
  referencia: z.string().trim().max(120).optional(),
});

export async function registrarPagoAction(payload: z.input<typeof pagoSchema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = pagoSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    const user = await getSessionUser();
    await registrarPagoExterno({
      solicitud_id: d.solicitudId,
      monto: d.monto,
      moneda: d.moneda,
      fecha_pago: d.fecha_pago,
      metodo: d.metodo,
      referencia: d.referencia,
      registrado_por: user?.nombre,
    });
    revalidatePath(`/oportunidades/${d.oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getSalidasAction(bloqueoId: string): Promise<{ ok: boolean; salidas?: SalidaExterna[]; error?: string }> {
  try {
    const salidas = await listSalidasExternas(bloqueoId);
    return { ok: true, salidas };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

const schema = z.object({
  oportunidadId: z.string().uuid(),
  bloqueoId: z.string().min(1),
  fechaId: z.string().min(1),
  planNombre: z.string().trim().min(1),
  salidaFecha: z.string().nullable().optional().default(null),
  monto: z.number().nonnegative().nullable().optional().default(null),
  moneda: z.string().max(8).default("USD"),
});

export async function crearReservaAction(
  payload: z.input<typeof schema>,
): Promise<{ ok: boolean; error?: string; solicitudId?: string }> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    const res = await crearReservaDesdeOportunidad({
      oportunidadId: d.oportunidadId,
      bloqueoId: d.bloqueoId,
      fechaId: d.fechaId,
      planNombre: d.planNombre,
      salidaFecha: d.salidaFecha ?? null,
      monto: d.monto ?? null,
      moneda: d.moneda,
    });
    revalidatePath(`/oportunidades/${d.oportunidadId}`);
    return { ok: true, solicitudId: res.solicitudId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function cancelarReservaAction(reservaId: string, oportunidadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await cancelarReserva(reservaId);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
