import "server-only";
import type { EmpresaListItem } from "@/lib/db/empresas";
import type { ContactoListItem } from "@/lib/db/contactos";
import type { OportunidadListItem } from "@/lib/db/oportunidades";
import type { Producto } from "@/lib/db/productos";

export type ModuloExport = "empresas" | "contactos" | "oportunidades" | "productos";

/**
 * Catálogo de columnas exportables por módulo. La `key` coincide con la `key`
 * del catálogo de columnas de la tabla (app/(app)/<modulo>/tabla/columns.tsx)
 * para que el export respete exactamente las columnas visibles. `label` es el
 * encabezado en el archivo; `value` extrae el valor del list item.
 */
export type ExportColumn<T> = { key: string; label: string; value: (row: T) => string | number };

function fmtFecha(s: string | null): string {
  if (!s) return "";
  try { return new Date(s).toISOString().slice(0, 10); } catch { return s; }
}
const txt = (v: string | null | undefined) => v ?? "";
const num = (v: number | null | undefined) => (v == null ? "" : v);

export const EMPRESA_EXPORT_COLS: ExportColumn<EmpresaListItem>[] = [
  { key: "nombre", label: "Nombre", value: (e) => e.nombre },
  { key: "estado", label: "Estado", value: (e) => txt(e.estado_empresa) },
  { key: "ciudad", label: "Ciudad", value: (e) => txt(e.ciudad) },
  { key: "pais", label: "País", value: (e) => txt(e.pais) },
  { key: "email", label: "Email", value: (e) => txt(e.email) },
  { key: "telefono", label: "Teléfono", value: (e) => txt(e.telefono) },
  { key: "origen", label: "Origen", value: (e) => txt(e.origen) },
  { key: "sitio_web", label: "Sitio web", value: (e) => txt(e.sitio_web) },
  { key: "asignado", label: "Propietario", value: (e) => txt(e.asignado_nombre) },
  { key: "contactos", label: "Contactos", value: (e) => num(e.contactos_count) },
  { key: "oportunidades", label: "Oportunidades", value: (e) => num(e.oportunidades_count) },
  { key: "creado", label: "Creación", value: (e) => fmtFecha(e.creado_en) },
];

export const CONTACTO_EXPORT_COLS: ExportColumn<ContactoListItem>[] = [
  { key: "nombre", label: "Nombre", value: (c) => c.nombre },
  { key: "cargo", label: "Cargo", value: (c) => txt(c.cargo) },
  { key: "empresa", label: "Empresa", value: (c) => txt(c.empresa_nombre) },
  { key: "email", label: "Email", value: (c) => txt(c.email) },
  { key: "telefono", label: "Teléfono", value: (c) => txt(c.telefono) },
  { key: "whatsapp", label: "WhatsApp", value: (c) => txt(c.telefono_whatsapp) },
  { key: "origen", label: "Origen", value: (c) => txt(c.origen) },
  { key: "asignado", label: "Propietario", value: (c) => txt(c.asignado_nombre) },
  { key: "oportunidades", label: "Oportunidades", value: (c) => num(c.oportunidades_count) },
];

export const OPORTUNIDAD_EXPORT_COLS: ExportColumn<OportunidadListItem>[] = [
  { key: "nombre", label: "Nombre", value: (o) => o.nombre },
  { key: "empresa", label: "Empresa", value: (o) => txt(o.empresa_nombre) },
  { key: "contacto", label: "Contacto", value: (o) => txt(o.contacto_nombre) },
  { key: "embudo_etapa", label: "Embudo / Etapa", value: (o) => [o.pipeline_nombre, o.etapa_nombre].filter(Boolean).join(" · ") },
  { key: "etapa_anterior", label: "Etapa anterior", value: (o) => txt(o.etapa_anterior_nombre) },
  { key: "estado", label: "Estado", value: (o) => txt(o.estado) },
  { key: "valor", label: "Valor", value: (o) => num(o.valor) },
  { key: "moneda", label: "Moneda", value: (o) => txt(o.moneda) },
  { key: "probabilidad", label: "Probabilidad (%)", value: (o) => num(o.probabilidad_cierre) },
  { key: "cierre", label: "Cierre esperado", value: (o) => fmtFecha(o.fecha_esperada_cierre) },
  { key: "asignado", label: "Propietario", value: (o) => txt(o.asignado_nombre) },
  { key: "creado", label: "Creación", value: (o) => fmtFecha(o.creado_en) },
];

export const PRODUCTO_EXPORT_COLS: ExportColumn<Producto>[] = [
  { key: "nombre", label: "Nombre", value: (p) => p.nombre },
  { key: "categoria", label: "Categoría", value: (p) => txt(p.categoria) },
  { key: "destino", label: "Destino", value: (p) => txt(p.destino) },
  { key: "duracion", label: "Duración", value: (p) => txt(p.duracion) },
  { key: "precio", label: "Precio desde", value: (p) => num(p.precio_desde) },
  { key: "proveedor", label: "Proveedor", value: (p) => txt(p.proveedor) },
  { key: "estado", label: "Estado", value: (p) => (p.activo ? "Activo" : "Inactivo") },
];

/** Proyecta un list item a un objeto plano {label: valor} según las cols pedidas. */
export function projectRow<T>(row: T, catalog: ExportColumn<T>[], cols: string[] | undefined): Record<string, string | number> {
  const wanted = cols?.length
    ? catalog.filter((c) => cols.includes(c.key))
    : catalog;
  // Siempre garantizar al menos "nombre".
  const ordered = wanted.length ? wanted : catalog.filter((c) => c.key === "nombre");
  const out: Record<string, string | number> = {};
  for (const c of ordered) out[c.label] = c.value(row);
  return out;
}
