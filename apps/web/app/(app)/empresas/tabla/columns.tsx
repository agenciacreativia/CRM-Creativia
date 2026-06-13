import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { EmpresaListItem } from "@/lib/db/empresas";

const ESTADO_BADGE: Record<string, "info" | "success" | "default"> = {
  prospecto: "info", cliente: "success", inactivo: "default",
};
function fmtDate(s: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("es", { dateStyle: "short" }); } catch { return s; }
}

export type EmpresaColumn = {
  key: string;
  label: string;
  align?: "right";
  fixed?: boolean;
  render: (e: EmpresaListItem) => React.ReactNode;
};

/** Catálogo de columnas de la tabla de empresas. `key` alineado con EXPORT_COLS. */
export const EMPRESA_COLUMNS: EmpresaColumn[] = [
  {
    key: "nombre", label: "Nombre", fixed: true,
    render: (e) => <Link href={`/empresas/${e.id}`} className="font-medium text-brand-primary hover:underline">{e.nombre}</Link>,
  },
  { key: "estado", label: "Estado", render: (e) => <Badge variant={ESTADO_BADGE[e.estado_empresa] ?? "default"}>{e.estado_empresa}</Badge> },
  { key: "ciudad", label: "Ciudad", render: (e) => <span className="text-gray-600">{e.ciudad ?? "—"}</span> },
  { key: "pais", label: "País", render: (e) => <span className="text-gray-600">{e.pais ?? "—"}</span> },
  { key: "email", label: "Email", render: (e) => <span className="text-gray-600">{e.email ?? "—"}</span> },
  { key: "telefono", label: "Teléfono", render: (e) => <span className="text-gray-600">{e.telefono ?? "—"}</span> },
  { key: "origen", label: "Origen", render: (e) => <span className="text-gray-600">{e.origen ?? "—"}</span> },
  { key: "sitio_web", label: "Sitio web", render: (e) => <span className="text-gray-600">{e.sitio_web ?? "—"}</span> },
  { key: "asignado", label: "Propietario", render: (e) => <span className="text-gray-600">{e.asignado_nombre ?? <span className="text-gray-400">no asignado</span>}</span> },
  { key: "contactos", label: "Contactos", align: "right", render: (e) => <span className="text-gray-700 tabular-nums">{e.contactos_count}</span> },
  { key: "oportunidades", label: "Oportunidades", align: "right", render: (e) => <span className="text-gray-700 tabular-nums">{e.oportunidades_count}</span> },
  { key: "creado", label: "Creación", render: (e) => <span className="text-gray-500">{fmtDate(e.creado_en)}</span> },
];

export const EMPRESA_DEFAULT_COLS = ["nombre", "estado", "ciudad", "asignado", "contactos", "oportunidades"];

export function resolveEmpresaCols(colsParam: string | undefined): string[] {
  if (!colsParam) return EMPRESA_DEFAULT_COLS;
  const wanted = colsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const valid = wanted.filter((k) => EMPRESA_COLUMNS.some((c) => c.key === k));
  const withName = valid.includes("nombre") ? valid : ["nombre", ...valid];
  return withName.length > 1 ? withName : EMPRESA_DEFAULT_COLS;
}
