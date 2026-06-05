import "server-only";
import { createCuposSupabase } from "@/lib/supabase/externo";

/**
 * Write-back integration with the Turistea website's booking system, using
 * its official RPCs (crear_solicitud, cancelar_solicitud, registrar_pago,
 * cambiar_estado_solicitud). Verified against production. The website manages
 * cupos/states internally — we never touch them by hand.
 */

export type AgenciaExterna = { agencia_id: string; agencia_nombre: string };

export const PASAJEROS_BUCKET = "pasajeros-docs";

/** Upload a passenger document to Turistea's storage. Returns the stored path or null. */
export async function subirDocPasajeroTuristea(path: string, buffer: Buffer, mime: string): Promise<string | null> {
  const supabase = createCuposSupabase();
  if (!supabase) return null;
  try {
    const { error } = await supabase.storage.from(PASAJEROS_BUCKET).upload(path, buffer, {
      contentType: mime || "application/octet-stream",
      upsert: true,
    });
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

/** Resolve a CRM agency to its website agencia_id by NIT or email (clientes). */
export async function resolverAgenciaExterna(opts: { nit?: string | null; email?: string | null; nombre?: string | null }): Promise<AgenciaExterna | null> {
  const supabase = createCuposSupabase();
  if (!supabase) return null;
  try {
    let cliente: { nit: string | null; id_externo: string | null; nombre: string | null } | null = null;
    if (opts.nit && opts.nit !== "0") {
      const { data } = await supabase.from("clientes").select("nit, id_externo, nombre").eq("nit", opts.nit).maybeSingle();
      cliente = data ?? null;
    }
    if (!cliente && opts.email) {
      const { data } = await supabase.from("clientes").select("nit, id_externo, nombre").eq("email", opts.email).maybeSingle();
      cliente = data ?? null;
    }
    if (!cliente) return null;
    const agencia_id = (cliente.nit && cliente.nit !== "0" ? cliente.nit : cliente.id_externo) ?? "";
    if (!agencia_id) return null;
    return { agencia_id, agencia_nombre: cliente.nombre ?? opts.nombre ?? "" };
  } catch {
    return null;
  }
}

export type SalidaExterna = {
  id: string;
  fecha_salida: string | null;
  fecha_regreso: string | null;
  precio_dbl: number | null;
  precio_tpl: number | null;
  precio_sgl: number | null;
  precio_nino: number | null;
  cupos_disponibles: number | null;
  aerolinea: string | null;
};

/** Upcoming vigente departures of a plan, with live availability. */
export async function listSalidasExternas(bloqueoId: string): Promise<SalidaExterna[]> {
  const supabase = createCuposSupabase();
  if (!supabase) return [];
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data: fechas } = await supabase
      .from("bloqueo_fechas")
      .select("id, fecha_salida, fecha_regreso, precio_dbl, precio_tpl, precio_sgl, precio_nino, cupos_total, cupos_reservados, aerolinea, estado_salida")
      .eq("bloqueo_id", bloqueoId)
      .eq("estado_salida", "vigente")
      .gte("fecha_salida", hoy)
      .order("fecha_salida", { ascending: true });
    if (!fechas) return [];

    // Live availability per fecha.
    const ids = fechas.map((f) => f.id as string);
    const dispMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: disp } = await supabase
        .from("bloqueo_fechas_disponibilidad")
        .select("fecha_id, cupos_disponibles")
        .in("fecha_id", ids);
      for (const d of disp ?? []) dispMap.set(d.fecha_id as string, d.cupos_disponibles as number);
    }
    return fechas.map((f) => ({
      id: f.id as string,
      fecha_salida: f.fecha_salida as string | null,
      fecha_regreso: f.fecha_regreso as string | null,
      precio_dbl: f.precio_dbl as number | null,
      precio_tpl: f.precio_tpl as number | null,
      precio_sgl: f.precio_sgl as number | null,
      precio_nino: f.precio_nino as number | null,
      cupos_disponibles: dispMap.has(f.id as string)
        ? dispMap.get(f.id as string)!
        : Math.max(0, ((f.cupos_total as number) ?? 0) - ((f.cupos_reservados as number) ?? 0)),
      aerolinea: f.aerolinea as string | null,
    }));
  } catch {
    return [];
  }
}

export type SolicitudExterna = {
  id: string;
  plan_nombre: string | null;
  fecha_salida: string | null;
  estado: string;
  agencia_id: string | null;
  agencia_nombre: string | null;
  adultos: number;
  ninos: number;
  bebes: number;
  cupos_solicitados: number | null;
  monto_total: number | null;
  monto_pagado: number | null;
  moneda: string | null;
  nombre_agente: string | null;
  created_at: string;
};

/**
 * Live reservations from the website (`bloqueo_solicitudes`). Filtered by
 * agencia_id for an agency view, or all for the wholesaler (platform) view.
 * This is what makes website-originated bookings show up in the CRM.
 */
export async function listSolicitudesExternas(opts: { agenciaId?: string; limit?: number } = {}): Promise<SolicitudExterna[]> {
  const supabase = createCuposSupabase();
  if (!supabase) return [];
  try {
    let query = supabase
      .from("bloqueo_solicitudes")
      .select(
        "id, estado, agencia_id, agencia_nombre, nombre_agente, pasajeros_adultos, pasajeros_ninos, pasajeros_bebes, cupos_solicitados, monto_total, monto_pagado, moneda_pago, created_at, bloqueo:bloqueo_id(nombre), fecha:fecha_id(fecha_salida)",
      )
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);
    if (opts.agenciaId) query = query.eq("agencia_id", opts.agenciaId);
    const { data, error } = await query;
    if (error) return [];
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
      const bloqueo = (Array.isArray(r.bloqueo) ? r.bloqueo[0] : r.bloqueo) as { nombre: string } | null;
      const fecha = (Array.isArray(r.fecha) ? r.fecha[0] : r.fecha) as { fecha_salida: string } | null;
      return {
        id: r.id as string,
        plan_nombre: bloqueo?.nombre ?? null,
        fecha_salida: fecha?.fecha_salida ?? null,
        estado: (r.estado as string) ?? "pendiente",
        agencia_id: (r.agencia_id as string | null) ?? null,
        agencia_nombre: (r.agencia_nombre as string | null) ?? null,
        adultos: (r.pasajeros_adultos as number) ?? 0,
        ninos: (r.pasajeros_ninos as number) ?? 0,
        bebes: (r.pasajeros_bebes as number) ?? 0,
        cupos_solicitados: (r.cupos_solicitados as number | null) ?? null,
        monto_total: (r.monto_total as number | null) ?? null,
        monto_pagado: (r.monto_pagado as number | null) ?? null,
        moneda: (r.moneda_pago as string | null) ?? null,
        nombre_agente: (r.nombre_agente as string | null) ?? null,
        created_at: r.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

export type CrearSolicitudParams = {
  fecha_id: string;
  agencia: AgenciaExterna;
  nombre_agente: string;
  email_agente: string;
  telefono_agente: string;
  adultos: number;
  ninos: number;
  bebes: number;
  pasajeros_detalle: unknown[];
  mensaje: string;
};

/** Create the reservation in the website (crear_solicitud RPC). Returns the solicitud id. */
export async function crearSolicitudExterna(p: CrearSolicitudParams): Promise<string> {
  const supabase = createCuposSupabase();
  if (!supabase) throw new Error("Integración con el sitio no configurada");
  const { data, error } = await supabase.rpc("crear_solicitud", {
    p_fecha_id: p.fecha_id,
    p_agencia_id: p.agencia.agencia_id,
    p_agencia_nombre: p.agencia.agencia_nombre,
    p_nombre_agente: p.nombre_agente,
    p_email_agente: p.email_agente,
    p_telefono_agente: p.telefono_agente,
    p_adultos: p.adultos,
    p_ninos: p.ninos,
    p_bebes: p.bebes,
    p_pasajeros_detalle: p.pasajeros_detalle,
    p_mensaje: p.mensaje,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Push the room/accommodation counts to the website's solicitud. Best-effort. */
export async function actualizarAcomodacionesTuristea(
  solicitudId: string,
  acom: { sencilla: number; doble: number; triple: number },
): Promise<void> {
  const supabase = createCuposSupabase();
  if (!supabase) return;
  try {
    await supabase
      .from("bloqueo_solicitudes")
      .update({
        acom_sencilla_cant: acom.sencilla,
        acom_doble_cant: acom.doble,
        acom_triple_cant: acom.triple,
      })
      .eq("id", solicitudId);
  } catch {
    /* best-effort */
  }
}

export async function cancelarSolicitudExterna(solicitudId: string): Promise<void> {
  const supabase = createCuposSupabase();
  if (!supabase) throw new Error("Integración con el sitio no configurada");
  const { error } = await supabase.rpc("cancelar_solicitud", { p_solicitud_id: solicitudId });
  if (error) throw new Error(error.message);
}

export async function registrarPagoExterno(p: {
  solicitud_id: string;
  monto: number;
  moneda: string;
  fecha_pago: string;
  metodo: string;
  referencia?: string;
  notas?: string;
  registrado_por?: string;
}): Promise<void> {
  const supabase = createCuposSupabase();
  if (!supabase) throw new Error("Integración con el sitio no configurada");
  const { error } = await supabase.rpc("registrar_pago", {
    p_solicitud_id: p.solicitud_id,
    p_monto: p.monto,
    p_moneda: p.moneda,
    p_fecha_pago: p.fecha_pago,
    p_metodo: p.metodo,
    p_referencia: p.referencia ?? null,
    p_comprobante_path: null,
    p_notas: p.notas ?? null,
    p_registrado_por: p.registrado_por ?? null,
  });
  if (error) throw new Error(error.message);
}
