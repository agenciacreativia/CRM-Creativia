import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Producto } from "@/lib/db/productos";

function fmtPrice(v: number | null, m: string) {
  if (v == null) return "—";
  try { return new Intl.NumberFormat("es", { style: "currency", currency: m }).format(v); } catch { return `${v} ${m}`; }
}

export type ProductoColumn = {
  key: string;
  label: string;
  align?: "right";
  fixed?: boolean;
  render: (p: Producto) => React.ReactNode;
};

/** Catálogo de columnas de la tabla de productos. `key` alineado con EXPORT_COLS. */
export const PRODUCTO_COLUMNS: ProductoColumn[] = [
  {
    key: "nombre", label: "Nombre", fixed: true,
    render: (p) => <Link href={`/productos/${p.id}`} className="font-medium text-brand-primary hover:underline">{p.nombre}</Link>,
  },
  { key: "categoria", label: "Categoría", render: (p) => <span className="text-gray-600">{p.categoria ?? "—"}</span> },
  { key: "destino", label: "Destino", render: (p) => <span className="text-gray-600">{p.destino ?? "—"}</span> },
  { key: "duracion", label: "Duración", render: (p) => <span className="text-gray-600">{p.duracion ?? "—"}</span> },
  { key: "precio", label: "Desde", align: "right", render: (p) => <span className="text-gray-700 tabular-nums">{fmtPrice(p.precio_desde, p.moneda)}</span> },
  { key: "proveedor", label: "Proveedor", render: (p) => <span className="text-gray-600">{p.proveedor ?? "—"}</span> },
  { key: "estado", label: "Estado", render: (p) => <Badge variant={p.activo ? "success" : "default"}>{p.activo ? "activo" : "inactivo"}</Badge> },
];

export const PRODUCTO_DEFAULT_COLS = ["nombre", "categoria", "destino", "precio", "estado"];

export function resolveProductoCols(colsParam: string | undefined): string[] {
  if (!colsParam) return PRODUCTO_DEFAULT_COLS;
  const wanted = colsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const valid = wanted.filter((k) => PRODUCTO_COLUMNS.some((c) => c.key === k));
  const withName = valid.includes("nombre") ? valid : ["nombre", ...valid];
  return withName.length > 1 ? withName : PRODUCTO_DEFAULT_COLS;
}
