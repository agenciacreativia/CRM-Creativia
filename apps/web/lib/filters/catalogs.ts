/**
 * Fixed (built-in column) filter fields per entity. Custom fields from
 * `campo_personalizado` get appended at runtime by the page.
 */
import type { FilterField } from "./types";

const ORIGEN_EMPRESA = [
  { value: "web", label: "Web" },
  { value: "referencia", label: "Referencia" },
  { value: "cold_call", label: "Cold call" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" },
];

const ORIGEN_CONTACTO = [
  { value: "empresa", label: "Empresa" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "cold_call", label: "Cold call" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" },
];

export const FIXED_FIELDS: Record<"empresa" | "contacto" | "oportunidad", FilterField[]> = {
  empresa: [
    { key: "nombre", label: "Nombre", type: "texto" },
    { key: "email", label: "Email", type: "texto" },
    { key: "telefono", label: "Teléfono", type: "texto" },
    { key: "ciudad", label: "Ciudad", type: "texto" },
    { key: "pais", label: "País", type: "texto" },
    {
      key: "estado_empresa",
      label: "Estado",
      type: "seleccion",
      options: [
        { value: "prospecto", label: "Prospecto" },
        { value: "cliente", label: "Cliente" },
        { value: "inactivo", label: "Inactivo" },
      ],
    },
    { key: "origen", label: "Origen", type: "seleccion", options: ORIGEN_EMPRESA },
    { key: "creado_en", label: "Fecha de creación", type: "fecha" },
  ],
  contacto: [
    { key: "nombre", label: "Nombre", type: "texto" },
    { key: "cargo", label: "Cargo", type: "texto" },
    { key: "email", label: "Email", type: "texto" },
    { key: "telefono", label: "Teléfono", type: "texto" },
    { key: "origen", label: "Origen", type: "seleccion", options: ORIGEN_CONTACTO },
  ],
  oportunidad: [
    { key: "nombre", label: "Nombre", type: "texto" },
    { key: "valor", label: "Valor", type: "numero" },
    {
      key: "estado",
      label: "Estado",
      type: "seleccion",
      options: [
        { value: "activo", label: "Activa" },
        { value: "ganado", label: "Ganada" },
        { value: "perdido", label: "Perdida" },
        { value: "eliminado", label: "Eliminada" },
      ],
    },
    {
      key: "moneda",
      label: "Moneda",
      type: "seleccion",
      options: ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"].map((m) => ({
        value: m,
        label: m,
      })),
    },
    { key: "probabilidad_cierre", label: "Probabilidad (%)", type: "numero" },
    { key: "fecha_esperada_cierre", label: "Cierre esperado", type: "fecha" },
  ],
};

/** Map a custom-field type to a filter type. */
import type { TipoCampo } from "@/lib/db/campos";
export function customTipoToFilterType(tipo: TipoCampo): FilterField["type"] {
  switch (tipo) {
    case "numero":
    case "moneda":
      return "numero";
    case "fecha":
      return "fecha";
    case "seleccion":
      return "seleccion";
    case "checkbox":
      return "booleano";
    default:
      return "texto";
  }
}
