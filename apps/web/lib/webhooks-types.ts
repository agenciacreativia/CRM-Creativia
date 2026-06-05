/** Webhook event keys — client-safe (no server imports). */

export const EVENTOS_WEBHOOK = [
  "contacto.creado",
  "oportunidad.creada",
  "oportunidad.etapa_cambiada",
  "oportunidad.ganada",
  "oportunidad.perdida",
] as const;

export type EventoWebhook = (typeof EVENTOS_WEBHOOK)[number];

export type Webhook = {
  id: string;
  nombre: string;
  url: string;
  eventos: string[];
  activo: boolean;
  ultimo_envio: string | null;
  ultimo_estado: number | null;
};
