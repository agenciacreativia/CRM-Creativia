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

export const FIXED_FIELDS: Record<"empresa" | "contacto" | "oportunidad" | "producto", FilterField[]> = {
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
    { key: "sitio_web", label: "Sitio web", type: "texto" },
    { key: "direccion", label: "Dirección", type: "texto" },
    { key: "descripcion", label: "Descripción", type: "texto" },
    { key: "asignado_id", label: "Propietario", type: "seleccion" },
    { key: "creado_en", label: "Fecha de creación", type: "fecha" },
  ],
  contacto: [
    { key: "nombre", label: "Nombre", type: "texto" },
    { key: "cargo", label: "Cargo", type: "texto" },
    { key: "email", label: "Email", type: "texto" },
    { key: "telefono", label: "Teléfono", type: "texto" },
    { key: "telefono_whatsapp", label: "WhatsApp", type: "texto" },
    { key: "origen", label: "Origen", type: "seleccion", options: ORIGEN_CONTACTO },
    { key: "descripcion", label: "Descripción", type: "texto" },
    { key: "empresa_nombre", label: "Empresa", type: "texto" },
    { key: "asignado_id", label: "Propietario", type: "seleccion" },
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
    // type "seleccion" sin options acá: las opciones (usuarios/pipelines/etapas
    // del tenant) se inyectan dinámicamente en lib/filters/server.ts.
    { key: "asignado_id", label: "Propietario", type: "seleccion" },
    { key: "pipeline_id", label: "Embudo", type: "seleccion" },
    { key: "etapa_id", label: "Etapa actual", type: "seleccion" },
    { key: "etapa_anterior_id", label: "Etapa anterior", type: "seleccion" },
    { key: "fecha_entrado_etapa", label: "Entró a etapa actual", type: "fecha" },
    { key: "descripcion", label: "Descripción", type: "texto" },
    { key: "creado_en", label: "Fecha de creación", type: "fecha" },
  ],
  producto: [
    { key: "nombre", label: "Nombre", type: "texto" },
    { key: "categoria", label: "Categoría", type: "texto" },
    { key: "destino", label: "Destino", type: "texto" },
    { key: "precio_desde", label: "Precio desde", type: "numero" },
    {
      key: "moneda",
      label: "Moneda",
      type: "seleccion",
      options: ["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"].map((m) => ({ value: m, label: m })),
    },
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
