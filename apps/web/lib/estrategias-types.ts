/** Commercial strategies (8) — client-safe. */

export const ESTRATEGIAS = [
  { key: "referido", label: "Referido" },
  { key: "cliente_recurrente", label: "Cliente recurrente" },
  { key: "campana_email", label: "Campaña por correo" },
  { key: "redes_sociales", label: "Redes sociales" },
  { key: "sitio_web", label: "Sitio web / SEO" },
  { key: "publicidad_paga", label: "Publicidad paga" },
  { key: "evento_ferial", label: "Evento / Feria" },
  { key: "alianza_corporativa", label: "Alianza corporativa" },
] as const;

export type Estrategia = (typeof ESTRATEGIAS)[number]["key"];

export const ESTRATEGIA_LABEL: Record<string, string> = Object.fromEntries(
  ESTRATEGIAS.map((e) => [e.key, e.label]),
);
