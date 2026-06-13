import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { OportunidadListItem } from "@/lib/db/oportunidades";

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  activo: "info", ganado: "success", perdido: "danger", eliminado: "default",
};
function money(v: number | null, m: string) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m }).format(v);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("es", { dateStyle: "short" }); } catch { return s; }
}

export type OppColumn = {
  key: string;
  label: string;
  align?: "right";
  /** Columna fija que no se puede ocultar (Nombre). */
  fixed?: boolean;
  render: (o: OportunidadListItem) => React.ReactNode;
};

/** Catálogo de columnas de la tabla de oportunidades. */
export const OPP_COLUMNS: OppColumn[] = [
  {
    key: "nombre", label: "Nombre", fixed: true,
    render: (o) => <Link href={`/oportunidades/${o.id}`} className="font-medium text-brand-primary hover:underline">{o.nombre}</Link>,
  },
  {
    key: "empresa", label: "Empresa",
    render: (o) => <Link href={`/empresas/${o.empresa_id}`} className="text-brand-primary hover:underline">{o.empresa_nombre}</Link>,
  },
  { key: "contacto", label: "Contacto", render: (o) => <span className="text-gray-600">{o.contacto_nombre}</span> },
  {
    key: "embudo_etapa", label: "Embudo / Etapa",
    render: (o) => <span className="text-gray-600"><span className="text-xs">{o.pipeline_nombre} · </span>{o.etapa_nombre}</span>,
  },
  { key: "etapa_anterior", label: "Etapa anterior", render: (o) => <span className="text-gray-500">{o.etapa_anterior_nombre ?? "—"}</span> },
  { key: "estado", label: "Estado", render: (o) => <Badge variant={ESTADO_BADGE[o.estado] ?? "default"}>{o.estado}</Badge> },
  { key: "valor", label: "Valor", align: "right", render: (o) => <span className="text-gray-700 tabular-nums">{money(o.valor, o.moneda)}</span> },
  { key: "probabilidad", label: "Probabilidad", align: "right", render: (o) => <span className="text-gray-600 tabular-nums">{o.probabilidad_cierre != null ? `${o.probabilidad_cierre}%` : "—"}</span> },
  { key: "cierre", label: "Cierre esperado", render: (o) => <span className="text-gray-600">{fmtDate(o.fecha_esperada_cierre)}</span> },
  { key: "asignado", label: "Propietario", render: (o) => <span className="text-gray-600">{o.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</span> },
  { key: "creado", label: "Creación", render: (o) => <span className="text-gray-500">{fmtDate(o.creado_en)}</span> },
];

/** Columnas visibles por defecto (las que se mostraban antes del picker). */
export const OPP_DEFAULT_COLS = ["nombre", "empresa", "embudo_etapa", "estado", "valor", "asignado"];

/** Resuelve la lista de columnas visibles desde el param ?cols=, con fallback. */
export function resolveVisibleCols(colsParam: string | undefined): string[] {
  if (!colsParam) return OPP_DEFAULT_COLS;
  const wanted = colsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const valid = wanted.filter((k) => OPP_COLUMNS.some((c) => c.key === k));
  // Nombre siempre presente y primero.
  const withName = valid.includes("nombre") ? valid : ["nombre", ...valid];
  return withName.length > 1 ? withName : OPP_DEFAULT_COLS;
}
