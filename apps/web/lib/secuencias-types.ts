/** Sequence step types — client-safe. */

export type PasoSecuencia = {
  actividad_tipo: "llamada" | "email" | "whatsapp" | "reunion" | "otra";
  dias: number; // offset en días desde la inscripción
  descripcion: string;
};

export const PASO_TIPOS = ["llamada", "email", "whatsapp", "reunion", "otra"] as const;
