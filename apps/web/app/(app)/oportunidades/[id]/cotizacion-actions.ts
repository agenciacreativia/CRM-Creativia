"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveCotizacion, deleteCotizacion, logCambio } from "@/lib/db/mutations";

export type CotizacionResult = { ok: boolean; error?: string; id?: string };

const itemSchema = z.object({
  producto_id: z.string().uuid().nullable().optional().default(null),
  nombre: z.string().trim().min(1).max(300),
  descripcion: z.string().max(2000).nullable().optional().default(null),
  cantidad: z.number().nonnegative(),
  precio_unitario: z.number().nonnegative(),
  costo_unitario: z.number().nonnegative().optional().default(0),
});

const itinerarioDiaSchema = z.object({
  dia: z.number().int().min(1).max(60),
  titulo: z.string().trim().max(200),
  ciudad: z.string().max(120).nullable().optional().default(null),
  descripcion: z.string().max(4000).nullable().optional().default(null),
  incluye_comidas: z.array(z.enum(["desayuno", "almuerzo", "cena"])).optional().default([]),
});

// Reserva armada desde un bloqueo del sitio (opcional). Forma = ReservaCotizacion.
const paxSchema = z.object({
  tipo: z.enum(["adulto", "nino", "bebe"]),
  nombre: z.string().max(200).default(""),
  documento: z.string().max(80).default(""),
  fecha_nacimiento: z.string().max(20).default(""),
  habitacion_idx: z.number().int().optional(),
  habitacion_tipo: z.enum(["sgl", "dbl", "tpl"]).optional(),
});
const num = z.number().default(0);
const reservaSchema = z.object({
  bloqueo_id: z.string(),
  fecha_id: z.string(),
  plan: z.object({
    nombre: z.string().default(""),
    ciudad_origen: z.string().nullable().default(null),
    dias: z.number().nullable().default(null),
    noches: z.number().nullable().default(null),
    fecha_salida: z.string().nullable().default(null),
    fecha_regreso: z.string().nullable().default(null),
    aerolinea: z.string().nullable().default(null),
    moneda: z.string().default("USD"),
  }),
  contacto: z.object({
    nombre_agente: z.string().default(""),
    email_agente: z.string().default(""),
    telefono_agente: z.string().nullable().default(null),
    agencia_nombre: z.string().nullable().default(null),
  }),
  habitaciones: z
    .array(z.object({ idx: z.number().int(), tipo: z.enum(["sgl", "dbl", "tpl"]), capacidad: z.number().int() }))
    .max(50)
    .default([]),
  pasajeros: z.array(paxSchema).max(200).default([]),
  precios: z.object({ precio_dbl: num, precio_tpl: num, precio_sgl: num, precio_nino: num }),
  acom: z.object({ sencilla: num, doble: num, triple: num, nino: num, otros: num, otros_valor: num }),
  extras: z.object({ supl_asistencia: num, penalidades: num, tours: num, tiquete_adulto: num, tiquete_nino: num }),
  liquidacion: z.object({
    base_comisionable: num,
    comision_pct: num,
    otros_descuentos: num,
    iva_pct: num,
    retefuente_pct: num,
    reteiva_pct: num,
    reteica_pct: num,
    trm: num,
  }),
  config: z.object({
    tipo_confirmacion: z.string().default("bloqueo"),
    tipo_reserva: z.string().default("grupo_bloqueo"),
    factura_a: z.string().default("agencia"),
  }),
  snapshots: z.object({
    incluye: z.string().nullable().default(null),
    no_incluye: z.string().nullable().default(null),
    condiciones: z.string().nullable().default(null),
  }),
  mensaje: z.string().nullable().default(null),
});

const schema = z.object({
  id: z.string().uuid().nullable().optional().default(null),
  oportunidad_id: z.string().uuid(),
  titulo: z.string().trim().min(1, "Título requerido").max(200),
  moneda: z.enum(["USD", "ARS", "EUR", "MXN", "COP", "CLP", "PEN", "BRL"]),
  descuento: z.number().nonnegative().default(0),
  notas: z.string().max(5000).nullable().optional().default(null),
  validez_dias: z.number().int().min(0).max(365).default(15),
  estado: z.enum(["borrador", "enviada", "aceptada", "rechazada", "confirmada"]).default("borrador"),
  items: z.array(itemSchema).max(100),
  itinerario: z.array(itinerarioDiaSchema).max(60).optional().default([]),
  bloqueo_id: z.string().nullable().optional().default(null),
  fecha_id: z.string().nullable().optional().default(null),
  reserva: reservaSchema.nullable().optional().default(null),
});

export type CotizacionPayload = z.input<typeof schema>;

export async function saveCotizacionAction(payload: CotizacionPayload): Promise<CotizacionResult> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const d = parsed.data;
  try {
    const id = await saveCotizacion(d.id ?? null, {
      oportunidad_id: d.oportunidad_id,
      titulo: d.titulo,
      moneda: d.moneda,
      descuento: d.descuento,
      notas: d.notas ?? null,
      validez_dias: d.validez_dias,
      estado: d.estado,
      items: d.items.map((it) => ({
        producto_id: it.producto_id ?? null,
        nombre: it.nombre,
        descripcion: it.descripcion ?? null,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        costo_unitario: it.costo_unitario ?? 0,
      })),
      itinerario: (d.itinerario ?? []).map((day) => ({
        dia: day.dia,
        titulo: day.titulo,
        ciudad: day.ciudad ?? null,
        descripcion: day.descripcion ?? null,
        incluye_comidas: day.incluye_comidas ?? [],
      })),
      bloqueo_id: d.bloqueo_id ?? null,
      fecha_id: d.fecha_id ?? null,
      reserva_data: d.reserva ?? null,
    });
    await logCambio("oportunidad", d.oportunidad_id, d.id ? `Editó la cotización: ${d.titulo}` : `Creó una cotización: ${d.titulo}`);
    revalidatePath(`/oportunidades/${d.oportunidad_id}`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteCotizacionAction(id: string, oportunidadId: string): Promise<CotizacionResult> {
  try {
    await deleteCotizacion(id);
    revalidatePath(`/oportunidades/${oportunidadId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
