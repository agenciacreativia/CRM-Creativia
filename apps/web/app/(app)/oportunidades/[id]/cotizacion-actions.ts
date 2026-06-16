"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveCotizacion, deleteCotizacion, logCambio, marcarCotizacionEnviada } from "@/lib/db/mutations";
import { getBloqueoParaCotizacion, type BloqueoDetalleExterno } from "@/lib/db/reservas-externo";
import { getCotizacion } from "@/lib/db/cotizaciones";
import { renderCotizacionPDF } from "@/lib/cotizacion/pdf";
import { getTenantFromHeaders } from "@/lib/tenant";
import { getMyAccessToken } from "@/lib/db/google";
import { getSessionUser } from "@/lib/auth";
import { sendGmail } from "@/lib/google/gmail";
import { env } from "@/lib/env";
import { cotizacionTotal, calcLiquidacion, fmtMoney } from "@/lib/cotizacion/types";

export type CotizacionResult = { ok: boolean; error?: string; id?: string };
export type EnviarResult = { ok: boolean; error?: string; needsConnect?: boolean };

/** Envía la cotización al cliente: PDF adjunto + botón "Confirmar cotización" (magic-link). */
export async function enviarCotizacionAction(cotizacionId: string, oportunidadId: string, to: string): Promise<EnviarResult> {
  const dest = (to || "").trim();
  if (!/.+@.+\..+/.test(dest)) return { ok: false, error: "Email destino inválido" };

  const cot = await getCotizacion(cotizacionId);
  if (!cot) return { ok: false, error: "Cotización no encontrada" };

  const accessToken = await getMyAccessToken();
  if (!accessToken) return { ok: false, needsConnect: true, error: "Conectá tu Gmail en Ajustes para enviar la cotización." };

  const [user, tenant] = await Promise.all([getSessionUser(), getTenantFromHeaders()]);
  const agencia = tenant?.nombre_empresa || "Turistea CRM";
  const fecha = new Date(cot.creado_en).toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });

  // PDF
  let pdfB64: string;
  try {
    const buf = await renderCotizacionPDF(cot, { agencia, fecha });
    pdfB64 = buf.toString("base64");
  } catch (e) {
    return { ok: false, error: "No se pudo generar el PDF: " + (e instanceof Error ? e.message : "error") };
  }

  // Token + marcar enviada
  let token: string;
  try {
    token = await marcarCotizacionEnviada(cotizacionId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo preparar el envío" };
  }

  const proto = env.ROOT_URL.startsWith("https") ? "https" : "http";
  const sub = tenant?.subdominio ? `${tenant.subdominio}.` : "";
  const confirmUrl = `${proto}://${sub}${env.BASE_DOMAIN}/cotizaciones/confirmar/${token}`;

  const total = cot.reserva ? calcLiquidacion(cot.reserva).totalAPagar : cotizacionTotal(cot.items, cot.descuento);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#272255;max-width:560px;margin:0 auto">
      <h2 style="color:#272255;margin:0 0 4px">${escapeHtml(cot.titulo)}</h2>
      <p style="color:#6b7280;margin:0 0 16px">${escapeHtml(agencia)} · Cotización de viaje</p>
      <p>Hola, te compartimos la cotización adjunta en PDF.</p>
      <p style="font-size:18px;font-weight:bold">Total: ${fmtMoney(total, cot.moneda)}</p>
      <p>Si estás de acuerdo, confirmá la cotización con el siguiente botón:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${confirmUrl}" style="background:#ff8000;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;display:inline-block">Confirmar cotización</a>
      </p>
      <p style="color:#6b7280;font-size:12px">O copiá este enlace: ${confirmUrl}</p>
      <p style="color:#6b7280;font-size:12px">Válida por ${cot.validez_dias} días. Sujeta a confirmación de tarifa y disponibilidad.</p>
    </div>`;

  try {
    await sendGmail(accessToken, {
      to: dest,
      subject: `Cotización: ${cot.titulo}`,
      html,
      replyTo: user?.email,
      attachments: [{ filename: `cotizacion-${cotizacionId.slice(0, 8)}.pdf`, mimeType: "application/pdf", contentBase64: pdfB64 }],
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo enviar el correo" };
  }

  try {
    await logCambio("oportunidad", oportunidadId, `Envió la cotización "${cot.titulo}" a ${dest}`);
  } catch { /* no romper por el log */ }
  revalidatePath(`/oportunidades/${oportunidadId}`);
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Trae el detalle del bloqueo (itinerario, servicios, salidas con precios) para armar la cotización. */
export async function getBloqueoCotizacionAction(bloqueoId: string): Promise<BloqueoDetalleExterno | null> {
  if (!bloqueoId) return null;
  return getBloqueoParaCotizacion(bloqueoId);
}

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
