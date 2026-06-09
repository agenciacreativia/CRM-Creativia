import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { logCambio } from "@/lib/db/mutations";
import {
  resolverAgenciaExterna,
  crearSolicitudExterna,
  cancelarSolicitudExterna,
  subirDocPasajeroTuristea,
  actualizarAcomodacionesTuristea,
  PASAJEROS_BUCKET,
  type AgenciaExterna,
} from "@/lib/db/reservas-externo";
import { pasajerosConArchivo } from "@/lib/db/pasajeros";
import { listHabitaciones } from "@/lib/db/habitaciones";
import { validarHabitaciones, HABITACION_LABEL } from "@/lib/habitaciones-types";

/** Resolve the current tenant's website agency (by NIT, then admin email). */
export async function resolverMiAgencia(): Promise<{ agencia: AgenciaExterna | null; nit: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenantId) return { agencia: null, nit: null };
  const admin = createAdminSupabase();
  const { data: tenant } = await admin
    .from("tenant")
    .select("nit, admin_email, nombre_empresa")
    .eq("id", user.tenantId)
    .maybeSingle();
  const agencia = await resolverAgenciaExterna({
    nit: (tenant?.nit as string | null) ?? null,
    email: (tenant?.admin_email as string | null) ?? null,
    nombre: (tenant?.nombre_empresa as string | null) ?? null,
  });
  return { agencia, nit: (tenant?.nit as string | null) ?? null };
}

export type Reserva = {
  id: string;
  oportunidad_id: string | null;
  solicitud_externa_id: string | null;
  plan_nombre: string;
  salida_fecha: string | null;
  adultos: number;
  ninos: number;
  bebes: number;
  estado: string;
  monto: number | null;
  moneda: string;
  creado_en: string;
};

const COLS = "id, oportunidad_id, solicitud_externa_id, plan_nombre, salida_fecha, adultos, ninos, bebes, estado, monto, moneda, creado_en";

export async function listReservasDeOportunidad(oportunidadId: string): Promise<Reserva[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("reserva")
    .select(COLS)
    .eq("oportunidad_id", oportunidadId)
    .order("creado_en", { ascending: false });
  if (error) return [];
  return (data ?? []) as Reserva[];
}

/** Map external solicitud_id -> linked CRM opportunity (for the tracking view). */
export async function mapReservasPorSolicitud(): Promise<Record<string, { oportunidadId: string; nombre: string }>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("reserva")
    .select("solicitud_externa_id, oportunidad_id, oportunidad:oportunidad_id(nombre)")
    .not("solicitud_externa_id", "is", null);
  if (error) return {};
  const out: Record<string, { oportunidadId: string; nombre: string }> = {};
  for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
    const sid = r.solicitud_externa_id as string | null;
    const oid = r.oportunidad_id as string | null;
    if (!sid || !oid) continue;
    const opp = (Array.isArray(r.oportunidad) ? r.oportunidad[0] : r.oportunidad) as { nombre: string } | null;
    out[sid] = { oportunidadId: oid, nombre: opp?.nombre ?? "Oportunidad" };
  }
  return out;
}

export type NuevaReserva = {
  oportunidadId: string | null;
  bloqueoId: string;
  fechaId: string;
  planNombre: string;
  salidaFecha: string | null;
  monto: number | null;
  moneda: string;
  // Fallback manual (cuando no hay pasajeros cargados en la oportunidad).
  adultos?: number;
  ninos?: number;
  bebes?: number;
  pasajeros?: { nombre: string; documento?: string | null; tipo?: string }[];
};

/**
 * Create a reservation: resolve the agency → send it to the Turistea website
 * (crear_solicitud) → mirror it locally. Throws with a clear message if the
 * agency can't be matched to the website.
 */
export async function crearReservaDesdeOportunidad(input: NuevaReserva): Promise<{ reservaId: string; solicitudId: string }> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");

  const admin = createAdminSupabase();
  const { data: tenant } = await admin
    .from("tenant")
    .select("nit, admin_email, nombre_empresa")
    .eq("id", user.tenantId)
    .maybeSingle();

  const agencia = await resolverAgenciaExterna({
    nit: (tenant?.nit as string | null) ?? null,
    email: (tenant?.admin_email as string | null) ?? null,
    nombre: (tenant?.nombre_empresa as string | null) ?? null,
  });
  if (!agencia) {
    throw new Error("No pudimos identificar tu agencia en Turistea. Pedile al administrador que configure el NIT de la agencia.");
  }

  // Armar pasajeros: priorizar los cargados en la oportunidad (con documentos).
  let adultos = input.adultos ?? 0;
  let ninos = input.ninos ?? 0;
  let bebes = input.bebes ?? 0;
  let detalle: Record<string, unknown>[] = (input.pasajeros ?? []) as Record<string, unknown>[];
  let acom = { sencilla: 0, doble: 0, triple: 0 };

  if (input.oportunidadId) {
    const [stored, habitaciones] = await Promise.all([
      pasajerosConArchivo(input.oportunidadId),
      listHabitaciones(input.oportunidadId),
    ]);
    if (stored.length > 0) {
      // Validar distribución de habitaciones (adulto por habitación, sin menores solos, etc.).
      const validacion = validarHabitaciones(
        habitaciones,
        stored.map((p) => ({ id: p.id, nombre: p.nombre, tipo: p.tipo, habitacion_id: p.habitacion_id })),
      );
      if (!validacion.ok) {
        throw new Error(`Revisá las habitaciones antes de reservar: ${validacion.errores[0]}`);
      }
      acom = {
        sencilla: habitaciones.filter((h) => h.tipo === "sencilla").length,
        doble: habitaciones.filter((h) => h.tipo === "doble").length,
        triple: habitaciones.filter((h) => h.tipo === "triple").length,
      };
      const habById = new Map(habitaciones.map((h) => [h.id, h]));

      adultos = stored.filter((p) => p.tipo === "adulto").length;
      ninos = stored.filter((p) => p.tipo === "nino").length;
      bebes = stored.filter((p) => p.tipo === "bebe").length;
      detalle = [];
      for (const p of stored) {
        let docPath: string | null = null;
        if (p.contenido && p.archivo_nombre) {
          const safe = p.archivo_nombre.replace(/[^\w.\-]/g, "_");
          docPath = await subirDocPasajeroTuristea(
            `${input.oportunidadId}/${p.id}/${safe}`,
            p.contenido,
            p.archivo_mime ?? "application/octet-stream",
          );
        }
        const hab = p.habitacion_id ? habById.get(p.habitacion_id) : null;
        detalle.push({
          nombre: p.nombre,
          documento: p.documento,
          tipo: p.tipo,
          fecha_nacimiento: p.fecha_nacimiento,
          habitacion: hab ? `${hab.orden}` : null,
          habitacion_tipo: hab ? HABITACION_LABEL[hab.tipo] : null,
          doc_bucket: docPath ? PASAJEROS_BUCKET : null,
          doc_path: docPath,
        });
      }
    }
  }

  if (adultos + ninos + bebes === 0) {
    throw new Error("Agregá al menos un pasajero a la oportunidad antes de reservar.");
  }

  const solicitudId = await crearSolicitudExterna({
    fecha_id: input.fechaId,
    agencia,
    nombre_agente: user.nombre,
    email_agente: user.email,
    telefono_agente: "",
    adultos,
    ninos,
    bebes,
    pasajeros_detalle: detalle,
    mensaje: `Reserva desde CRM · ${input.planNombre}`,
  });

  // Enviar las acomodaciones (habitaciones) a Turistea.
  if (acom.sencilla + acom.doble + acom.triple > 0) {
    await actualizarAcomodacionesTuristea(solicitudId, acom);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("reserva")
    .insert({
      tenant_id: user.tenantId,
      oportunidad_id: input.oportunidadId,
      solicitud_externa_id: solicitudId,
      bloqueo_id: input.bloqueoId,
      fecha_id: input.fechaId,
      plan_nombre: input.planNombre,
      salida_fecha: input.salidaFecha,
      adultos,
      ninos,
      bebes,
      pasajeros: detalle,
      estado: "pendiente",
      monto: input.monto,
      moneda: input.moneda,
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (error) {
    // The website solicitud was created but the local mirror failed — surface it.
    throw new Error(`Reserva creada en el sitio (${solicitudId}) pero falló el registro local: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(`Reserva creada en el sitio (${solicitudId}) pero no se obtuvo ID del registro local`);
  }

  if (input.oportunidadId) {
    await logCambio("oportunidad", input.oportunidadId, `Creó una reserva: ${input.planNombre} (${adultos + ninos + bebes} pax)`);
  }
  return { reservaId: data.id, solicitudId };
}

/** Cancel a reservation: cancel on the website + mark local as cancelled. */
export async function cancelarReserva(reservaId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data: reserva } = await supabase.from("reserva").select("solicitud_externa_id, oportunidad_id").eq("id", reservaId).maybeSingle();
  if (!reserva) throw new Error("Reserva no encontrada");
  if (reserva.solicitud_externa_id) {
    await cancelarSolicitudExterna(reserva.solicitud_externa_id as string);
  }
  const { error } = await supabase
    .from("reserva")
    .update({ estado: "cancelada", actualizado_en: new Date().toISOString() })
    .eq("id", reservaId);
  if (error) throw new Error(error.message);
  if (reserva.oportunidad_id) await logCambio("oportunidad", reserva.oportunidad_id as string, "Canceló una reserva");
}
