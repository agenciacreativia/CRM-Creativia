import "server-only";
import type { FilterField } from "@/lib/filters/types";
import { getFilterFields } from "@/lib/filters/server";
import { listUsuarios } from "@/lib/db/usuarios";
import { PRODUCTO_CATEGORIAS } from "@/lib/db/productos";

export type ModuloBulk = "empresas" | "contactos" | "oportunidades" | "productos";

/** Mapea el módulo (plural, UI) a la entidad de campos personalizados. */
const ENTIDAD: Record<Exclude<ModuloBulk, "productos">, "empresa" | "contacto" | "oportunidad"> = {
  empresas: "empresa",
  contactos: "contacto",
  oportunidades: "oportunidad",
};

/**
 * Allowlist de campos nativos editables masivamente por módulo. La clave ES la
 * columna real en la tabla (igual que en los filtros). Excluimos identidad
 * derivada y campos especiales (etapa/embudo se mueven con su flujo propio).
 */
const NATIVE_EDITABLE: Record<ModuloBulk, string[]> = {
  empresas: ["nombre", "email", "telefono", "ciudad", "pais", "estado_empresa", "origen", "sitio_web", "direccion", "descripcion", "asignado_id"],
  contactos: ["nombre", "cargo", "email", "telefono", "telefono_whatsapp", "origen", "descripcion", "asignado_id"],
  oportunidades: ["nombre", "valor", "estado", "moneda", "probabilidad_cierre", "fecha_esperada_cierre", "descripcion", "asignado_id"],
  productos: [],
};

const MONEDAS = ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"];

/** Campos editables de productos (productos no tiene campos personalizados). */
function productoFields(): FilterField[] {
  return [
    { key: "nombre", label: "Nombre", type: "texto" },
    { key: "categoria", label: "Categoría", type: "seleccion", options: PRODUCTO_CATEGORIAS.map((c) => ({ value: c, label: c })) },
    { key: "destino", label: "Destino", type: "texto" },
    { key: "duracion", label: "Duración", type: "texto" },
    { key: "precio_desde", label: "Precio desde", type: "numero" },
    { key: "moneda", label: "Moneda", type: "seleccion", options: MONEDAS.map((m) => ({ value: m, label: m })) },
    { key: "proveedor", label: "Proveedor", type: "texto" },
    { key: "activo", label: "Activo", type: "booleano" },
  ];
}

/**
 * Devuelve los campos editables masivamente de un módulo: nativos (allowlist) +
 * todos los campos personalizados del tenant, con opciones reales inyectadas
 * (usuarios para Propietario; selección para estado/origen/moneda).
 * Cada campo trae `custom: true` si vive en campos_custom.
 */
export async function getEditableFields(modulo: ModuloBulk): Promise<FilterField[]> {
  if (modulo === "productos") return productoFields();

  const entidad = ENTIDAD[modulo];
  const all = await getFilterFields(entidad); // nativos (FIXED_FIELDS) + custom
  const allow = NATIVE_EDITABLE[modulo];

  // Nativos en el orden del allowlist.
  const nativos = allow
    .map((k) => all.find((f) => f.key === k && !f.custom))
    .filter((f): f is FilterField => Boolean(f));
  // Todos los custom.
  const custom = all.filter((f) => f.custom);

  // Inyectar usuarios reales en asignado_id (Propietario).
  const needsUsuarios = nativos.some((f) => f.key === "asignado_id");
  if (needsUsuarios) {
    const usuarios = await listUsuarios({ activo: "activos" }).catch(() => []);
    const opts = usuarios.map((u) => ({ value: u.id, label: u.nombre }));
    for (const f of nativos) {
      if (f.key === "asignado_id") {
        f.options = opts;
        f.type = "seleccion";
      }
    }
  }

  return [...nativos, ...custom];
}
