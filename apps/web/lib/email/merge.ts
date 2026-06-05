/**
 * Email merge tags. Templates use {{clave}} tokens that get replaced with the
 * opportunity's real data (fixed fields + custom fields). Pure (client + server).
 */
import type { OportunidadDetail } from "@/lib/db/oportunidades";
import type { ContactoDetail } from "@/lib/db/contactos";
import type { EmpresaDetail } from "@/lib/db/empresas";
import type { CampoPersonalizado } from "@/lib/db/campos";

export type MergeVars = Record<string, string>;
export type MergeField = { token: string; label: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Replace {{ clave }} tokens (case-insensitive, spaces allowed). */
export function applyMerge(text: string, vars: MergeVars, html = false): string {
  if (!text) return text;
  const lower: MergeVars = {};
  for (const k of Object.keys(vars)) lower[k.toLowerCase()] = vars[k];
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = lower[String(key).toLowerCase()];
    if (v === undefined) return _m; // leave unknown tokens untouched
    return html ? escapeHtml(v) : v;
  });
}

function fmtMoney(value: number | null, moneda: string): string {
  if (value == null) return "";
  return new Intl.NumberFormat("es", { style: "currency", currency: moneda }).format(value);
}
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });
}

export const STANDARD_FIELDS: MergeField[] = [
  { token: "{{oportunidad}}", label: "Nombre de la oportunidad" },
  { token: "{{valor}}", label: "Valor (formateado)" },
  { token: "{{moneda}}", label: "Moneda" },
  { token: "{{estado}}", label: "Estado" },
  { token: "{{probabilidad}}", label: "Probabilidad %" },
  { token: "{{cierre}}", label: "Cierre esperado" },
  { token: "{{etapa}}", label: "Etapa actual" },
  { token: "{{embudo}}", label: "Embudo" },
  { token: "{{contacto}}", label: "Nombre del contacto" },
  { token: "{{contacto_email}}", label: "Email del contacto" },
  { token: "{{contacto_telefono}}", label: "Teléfono del contacto" },
  { token: "{{contacto_cargo}}", label: "Cargo del contacto" },
  { token: "{{empresa}}", label: "Empresa" },
  { token: "{{empresa_ciudad}}", label: "Ciudad de la empresa" },
  { token: "{{empresa_pais}}", label: "País de la empresa" },
  { token: "{{asesor}}", label: "Asesor asignado" },
];

/** Build the variable map + the list of available tokens for one opportunity. */
export function buildMergeVars(args: {
  opp: OportunidadDetail;
  contacto: ContactoDetail | null;
  empresa: EmpresaDetail | null;
  campos: CampoPersonalizado[];
}): { vars: MergeVars; fields: MergeField[] } {
  const { opp, contacto, empresa, campos } = args;
  const vars: MergeVars = {
    oportunidad: opp.nombre,
    valor: fmtMoney(opp.valor, opp.moneda),
    moneda: opp.moneda,
    estado: opp.estado,
    probabilidad: opp.probabilidad_cierre != null ? `${opp.probabilidad_cierre}%` : "",
    cierre: fmtDate(opp.fecha_esperada_cierre),
    etapa: opp.etapa_nombre,
    embudo: opp.pipeline_nombre,
    contacto: contacto?.nombre ?? opp.contacto_nombre,
    contacto_email: contacto?.email ?? "",
    contacto_telefono: contacto?.telefono ?? "",
    contacto_cargo: contacto?.cargo ?? "",
    empresa: empresa?.nombre ?? opp.empresa_nombre,
    empresa_ciudad: empresa?.ciudad ?? "",
    empresa_pais: empresa?.pais ?? "",
    asesor: opp.asignado_nombre ?? "",
  };

  const fields: MergeField[] = [...STANDARD_FIELDS];
  for (const c of campos) {
    const raw = opp.campos_custom[c.clave];
    vars[c.clave] = raw == null ? "" : String(raw);
    fields.push({ token: `{{${c.clave}}}`, label: `${c.etiqueta} (personalizado)` });
  }

  return { vars, fields };
}
