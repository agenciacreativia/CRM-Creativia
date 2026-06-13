import Link from "next/link";
import type { ContactoListItem } from "@/lib/db/contactos";

export type ContactoColumn = {
  key: string;
  label: string;
  align?: "right";
  fixed?: boolean;
  render: (c: ContactoListItem) => React.ReactNode;
};

/** Catálogo de columnas de la tabla de contactos. `key` alineado con EXPORT_COLS. */
export const CONTACTO_COLUMNS: ContactoColumn[] = [
  {
    key: "nombre", label: "Nombre", fixed: true,
    render: (c) => <Link href={`/contactos/${c.id}`} className="font-medium text-brand-primary hover:underline">{c.nombre}</Link>,
  },
  { key: "cargo", label: "Cargo", render: (c) => <span className="text-gray-600">{c.cargo ?? "—"}</span> },
  {
    key: "empresa", label: "Empresa",
    render: (c) => <Link href={`/empresas/${c.empresa_id}`} className="text-gray-700 hover:underline">{c.empresa_nombre}</Link>,
  },
  { key: "email", label: "Email", render: (c) => <span className="text-gray-600">{c.email}</span> },
  { key: "telefono", label: "Teléfono", render: (c) => <span className="text-gray-600">{c.telefono ?? "—"}</span> },
  { key: "whatsapp", label: "WhatsApp", render: (c) => <span className="text-gray-600">{c.telefono_whatsapp ?? "—"}</span> },
  { key: "origen", label: "Origen", render: (c) => <span className="text-gray-600">{c.origen ?? "—"}</span> },
  { key: "asignado", label: "Propietario", render: (c) => <span className="text-gray-600">{c.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</span> },
  { key: "oportunidades", label: "Oportunidades", align: "right", render: (c) => <span className="text-gray-700 tabular-nums">{c.oportunidades_count}</span> },
];

export const CONTACTO_DEFAULT_COLS = ["nombre", "cargo", "empresa", "email", "asignado", "oportunidades"];

export function resolveContactoCols(colsParam: string | undefined): string[] {
  if (!colsParam) return CONTACTO_DEFAULT_COLS;
  const wanted = colsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const valid = wanted.filter((k) => CONTACTO_COLUMNS.some((c) => c.key === k));
  const withName = valid.includes("nombre") ? valid : ["nombre", ...valid];
  return withName.length > 1 ? withName : CONTACTO_DEFAULT_COLS;
}
