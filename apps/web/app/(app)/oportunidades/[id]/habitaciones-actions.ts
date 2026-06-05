"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { crearHabitacion, eliminarHabitacion, asignarPasajeroHabitacion } from "@/lib/db/habitaciones";

const tipo = z.enum(["sencilla", "doble", "triple"]);

export async function crearHabitacionAction(oportunidadId: string, t: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = tipo.safeParse(t);
  if (!parsed.success) return { ok: false, error: "Tipo inválido" };
  try {
    await crearHabitacion(oportunidadId, parsed.data);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function eliminarHabitacionAction(id: string, oportunidadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await eliminarHabitacion(id);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function asignarPasajeroAction(
  pasajeroId: string,
  habitacionId: string | null,
  oportunidadId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await asignarPasajeroHabitacion(pasajeroId, habitacionId);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
