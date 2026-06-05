/** Automation rule types — client-safe (no server imports). */

export type EventoAutomatizacion =
  | "oportunidad_creada"
  | "etapa_cambiada"
  | "oportunidad_ganada"
  | "oportunidad_perdida";

export const EVENTOS: { key: EventoAutomatizacion; label: string; necesitaEtapa?: boolean }[] = [
  { key: "oportunidad_creada", label: "Cuando se crea una oportunidad" },
  { key: "etapa_cambiada", label: "Cuando entra a una etapa", necesitaEtapa: true },
  { key: "oportunidad_ganada", label: "Cuando se gana una oportunidad" },
  { key: "oportunidad_perdida", label: "Cuando se pierde una oportunidad" },
];

export type AccionAutomatizacion =
  | { tipo: "crear_actividad"; actividad_tipo: "llamada" | "email" | "reunion" | "otra"; dias: number; descripcion: string }
  | { tipo: "asignar"; usuario_id: string }
  | { tipo: "etiquetar"; etiqueta_id: string };

export const TIPOS_ACCION: { key: AccionAutomatizacion["tipo"]; label: string }[] = [
  { key: "crear_actividad", label: "Crear actividad / recordatorio" },
  { key: "asignar", label: "Asignar a un usuario" },
  { key: "etiquetar", label: "Agregar etiqueta" },
];

export const ACTIVIDAD_TIPOS = ["llamada", "email", "reunion", "otra"] as const;
