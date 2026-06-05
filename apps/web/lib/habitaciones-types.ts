/** Room (accommodation) types + validation — client-safe. */

export type TipoHabitacion = "sencilla" | "doble" | "triple";

export const HABITACION_CAP: Record<TipoHabitacion, number> = { sencilla: 1, doble: 2, triple: 3 };
export const HABITACION_LABEL: Record<TipoHabitacion, string> = { sencilla: "Sencilla", doble: "Doble", triple: "Triple" };
export const TIPOS_HABITACION: TipoHabitacion[] = ["sencilla", "doble", "triple"];

export type PaxLite = { id: string; nombre: string; tipo: "adulto" | "nino" | "bebe"; habitacion_id: string | null };
export type HabLite = { id: string; tipo: TipoHabitacion; orden: number };

export type ValidacionHab = { ok: boolean; errores: string[] };

/**
 * Reglas:
 *  · cada pasajero debe estar en alguna habitación;
 *  · ninguna habitación puede superar su capacidad;
 *  · toda habitación con gente debe tener al menos 1 adulto
 *    (un niño/bebé no puede ir solo).
 */
export function validarHabitaciones(habs: HabLite[], pax: PaxLite[]): ValidacionHab {
  const errores: string[] = [];

  if (pax.length > 0 && habs.length === 0) {
    errores.push("Agregá al menos una habitación.");
  }

  const sinAsignar = pax.filter((p) => !p.habitacion_id);
  if (sinAsignar.length > 0) {
    errores.push(`${sinAsignar.length} pasajero(s) sin habitación: ${sinAsignar.map((p) => p.nombre).join(", ")}.`);
  }

  for (const h of habs) {
    const ocupantes = pax.filter((p) => p.habitacion_id === h.id);
    const cap = HABITACION_CAP[h.tipo];
    if (ocupantes.length > cap) {
      errores.push(`Habitación ${h.orden} (${HABITACION_LABEL[h.tipo]}): ${ocupantes.length} pasajeros y la capacidad es ${cap}.`);
    }
    if (ocupantes.length > 0 && ocupantes.filter((p) => p.tipo === "adulto").length === 0) {
      errores.push(`Habitación ${h.orden}: necesita al menos un adulto (un niño/bebé no puede ir solo).`);
    }
  }

  return { ok: errores.length === 0, errores };
}
