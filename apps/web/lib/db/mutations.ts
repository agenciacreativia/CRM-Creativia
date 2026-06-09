import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { getMyPermisos } from "@/lib/db/roles";
import { can, type ModuleKey, type ActionKey } from "@/lib/permissions";
import { ejecutarReglas } from "@/lib/db/automatizaciones";
import { dispatchWebhook } from "@/lib/db/webhooks";
import { resolverAsesor } from "@/lib/db/cuenta-madre";

async function ensureWriter() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores pueden editar");
  return u;
}

async function ensureSession() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  return u;
}

/**
 * Gate a write by the signed-in user's role permissions. Admins always pass.
 * This is the app-layer mirror of the DB `has_permiso()` RLS function.
 */
async function ensurePermission(mod: ModuleKey, action: ActionKey) {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  const { permisos, es_admin } = await getMyPermisos();
  if (!can(permisos, mod, action, es_admin)) {
    throw new Error("No tenés permiso para realizar esta acción");
  }
  return u;
}

type EmpresaUpdate = {
  nombre: string;
  email: string | null;
  telefono: string | null;
  sitio_web: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  descripcion: string | null;
  estado_empresa: "prospecto" | "cliente" | "inactivo";
  origen: "web" | "referencia" | "cold_call" | "evento" | "otro" | null;
  asignado_id: string | null;
};

export async function updateEmpresa(id: string, patch: EmpresaUpdate) {
  await ensurePermission("empresas", "editar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("empresa").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Append a change-history entry. Best-effort: never throws (so a missing table
 * before migration 0009, or an audit failure, can't break the actual edit).
 */
export async function logCambio(
  entidad: "empresa" | "contacto" | "oportunidad",
  entityId: string,
  descripcion: string,
) {
  try {
    const user = await getSessionUser();
    if (!user?.tenantId) return;
    const supabase = await createServerSupabase();
    await supabase.from("historial_cambio").insert({
      tenant_id: user.tenantId,
      entidad,
      entity_id: entityId,
      descripcion,
      cambiado_por: user.id,
    });
  } catch {
    /* ignore — audit must not break the operation */
  }
}

/* ---------- Cotizaciones ---------- */
import type { CotizacionItem, ItinerarioDia } from "@/lib/cotizacion/types";

export type CotizacionInput = {
  oportunidad_id: string;
  titulo: string;
  moneda: string;
  descuento: number;
  notas: string | null;
  validez_dias: number;
  estado: "borrador" | "enviada" | "aceptada" | "rechazada";
  items: CotizacionItem[];
  itinerario?: ItinerarioDia[];
};

export async function saveCotizacion(id: string | null, input: CotizacionInput): Promise<string> {
  const user = await ensureSession();
  if (!user.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();

  // Si la migración 0036 (que agrega la columna itinerario) todavía no se corrió
  // en este proyecto, retiramos el campo del payload y avisamos por log para
  // que el dato no se pierda silenciosamente — el resto del save sigue
  // funcionando con normalidad.
  const isMissingItinerarioColumn = (msg: string | undefined): boolean =>
    !!msg && /column.*itinerario.*does not exist/i.test(msg);

  if (id) {
    const payload = { ...input, actualizado_en: new Date().toISOString() };
    let { error } = await supabase.from("cotizacion").update(payload).eq("id", id);
    if (error && isMissingItinerarioColumn(error.message)) {
      console.warn("[saveCotizacion] columna 'itinerario' no existe; correr migración 0036. Guardando sin itinerario.");
      const { itinerario: _itin, ...sinItin } = payload;
      void _itin;
      ({ error } = await supabase.from("cotizacion").update(sinItin).eq("id", id));
    }
    if (error) throw new Error(error.message);
    return id;
  }

  const insert = { ...input, tenant_id: user.tenantId, creado_por: user.id };
  let { data, error } = await supabase.from("cotizacion").insert(insert).select("id").single();
  if (error && isMissingItinerarioColumn(error.message)) {
    console.warn("[saveCotizacion] columna 'itinerario' no existe; correr migración 0036. Insertando sin itinerario.");
    const { itinerario: _itin, ...sinItin } = insert;
    void _itin;
    ({ data, error } = await supabase.from("cotizacion").insert(sinItin).select("id").single());
  }
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("No se pudo guardar la cotización");
  return data.id;
}

export async function deleteCotizacion(id: string) {
  await ensureSession();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("cotizacion").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- Productos de la oportunidad (deal products) ---------- */
export type OportunidadProductoInput = {
  oportunidad_id: string;
  producto_id: string | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  moneda: string;
};

export async function addOportunidadProducto(input: OportunidadProductoInput): Promise<string> {
  const user = await ensureSession();
  if (!user.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad_producto")
    .insert({ ...input, tenant_id: user.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateOportunidadProducto(
  id: string,
  patch: { nombre?: string; cantidad?: number; precio_unitario?: number },
) {
  await ensureSession();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("oportunidad_producto").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeOportunidadProducto(id: string) {
  await ensureSession();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("oportunidad_producto").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- Productos (planes) ---------- */
export type ProductoInput = {
  nombre: string;
  categoria: string | null;
  destino: string | null;
  duracion: string | null;
  precio_desde: number | null;
  moneda: string;
  descripcion: string | null;
  incluye: string | null;
  no_incluye: string | null;
  proveedor: string | null;
  activo: boolean;
  /** Plan turístico opcional. Si la mig 0041 no corrió, lo descartamos antes del INSERT/UPDATE. */
  itinerario?: unknown[];
};

const isMissingProductoItinerarioColumn = (msg: string | undefined): boolean =>
  !!msg && /column.*itinerario.*does not exist/i.test(msg);

export async function createProducto(input: ProductoInput): Promise<string> {
  const user = await ensurePermission("productos", "crear");
  if (!user.tenantId) throw new Error("Tenant ausente");
  // Admin insert: a row auto-flagged en_espera by the cap trigger would be
  // hidden by RLS, breaking the RETURNING select. Admin bypasses RLS.
  const admin = createAdminSupabase();
  const payload: Record<string, unknown> = { ...input, tenant_id: user.tenantId, creado_por: user.id };
  let res = await admin.from("producto").insert(payload).select("id").single();
  if (res.error && isMissingProductoItinerarioColumn(res.error.message)) {
    // Mig 0041 no corrió todavía. Reintento sin itinerario.
    const { itinerario: _drop, ...rest } = payload;
    void _drop;
    res = await admin.from("producto").insert(rest).select("id").single();
  }
  if (res.error) throw new Error(res.error.message);
  return res.data!.id;
}

export async function updateProducto(id: string, patch: ProductoInput) {
  await ensurePermission("productos", "editar");
  const supabase = await createServerSupabase();
  const payload: Record<string, unknown> = { ...patch, actualizado_en: new Date().toISOString() };
  const first = await supabase.from("producto").update(payload).eq("id", id);
  if (first.error && isMissingProductoItinerarioColumn(first.error.message)) {
    const { itinerario: _drop, ...rest } = payload;
    void _drop;
    const retry = await supabase.from("producto").update(rest).eq("id", id);
    if (retry.error) throw new Error(retry.error.message);
    return;
  }
  if (first.error) throw new Error(first.error.message);
}

export async function deleteProducto(id: string) {
  await ensurePermission("productos", "eliminar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("producto").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- Plantillas de correo ---------- */
type PlantillaInput = { nombre: string; asunto: string; cuerpo_html: string };

export async function createPlantilla(input: PlantillaInput): Promise<string> {
  const user = await ensureSession();
  if (!user.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("plantilla_correo")
    .insert({ ...input, tenant_id: user.tenantId, creado_por: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updatePlantilla(id: string, patch: PlantillaInput) {
  const user = await ensureSession();
  if (!user.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("plantilla_correo")
    .update({ ...patch, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}

export async function deletePlantilla(id: string) {
  const user = await ensureSession();
  if (!user.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("plantilla_correo").delete().eq("id", id).eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}

/** Partial single-field update (inline editing). RLS enforces permissions. */
export async function patchEmpresa(id: string, patch: Record<string, unknown>) {
  await ensurePermission("empresas", "editar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("empresa").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export type NewEmpresa = EmpresaUpdate;

export async function createEmpresa(
  input: NewEmpresa,
  camposCustom: Record<string, unknown> = {},
): Promise<string> {
  const user = await ensurePermission("empresas", "crear");
  if (!user.tenantId) throw new Error("Tenant ausente");
  const admin = createAdminSupabase();
  const asignado = await resolverAsesor(user.tenantId, input.asignado_id);
  const { data, error } = await admin
    .from("empresa")
    .insert({ ...input, asignado_id: asignado, campos_custom: camposCustom, tenant_id: user.tenantId, creado_por: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

type ContactoUpdate = {
  empresa_id: string;
  nombre: string;
  cargo: string | null;
  email: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  descripcion: string | null;
  origen: "empresa" | "linkedin" | "cold_call" | "evento" | "otro" | null;
  asignado_id: string | null;
  fecha_nacimiento?: string | null;
};

export async function updateContacto(id: string, patch: ContactoUpdate) {
  await ensurePermission("contactos", "editar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("contacto").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function patchContacto(id: string, patch: Record<string, unknown>) {
  await ensurePermission("contactos", "editar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("contacto").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export type NewContacto = ContactoUpdate;

export async function createContacto(
  input: NewContacto,
  camposCustom: Record<string, unknown> = {},
): Promise<string> {
  const user = await ensurePermission("contactos", "crear");
  if (!user.tenantId) throw new Error("Tenant ausente");
  const admin = createAdminSupabase();
  const asignado = await resolverAsesor(user.tenantId, input.asignado_id);
  const { data, error } = await admin
    .from("contacto")
    .insert({ ...input, asignado_id: asignado, campos_custom: camposCustom, tenant_id: user.tenantId, creado_por: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await dispatchWebhook(user.tenantId, "contacto.creado", { id: data.id, nombre: input.nombre, email: input.email });
  return data.id;
}

/**
 * Borrar empresa con preview de impacto.
 *
 * Política:
 * - Si hay oportunidades ACTIVAS → bloqueamos. El admin debe cerrarlas
 *   (ganar/perder) o reasignarlas antes. No borramos activos por error.
 * - Si solo hay oportunidades cerradas + contactos → cascada: borramos
 *   contactos y la empresa; las oportunidades cerradas se eliminan con
 *   ON DELETE CASCADE del FK empresa_id (ya existe en el schema base).
 *
 * Devuelve cuántos registros relacionados se borraron, para el toast.
 */
export async function deleteEmpresaConCascada(
  id: string,
): Promise<{ contactos: number; oportunidades_cerradas: number }> {
  await ensurePermission("empresas", "eliminar");
  const admin = createAdminSupabase();

  // 1) Validar: sin oportunidades activas.
  const { data: activas, error: errAct } = await admin
    .from("oportunidad")
    .select("id, nombre")
    .eq("empresa_id", id)
    .eq("estado", "activo")
    .limit(5);
  if (errAct) throw new Error(errAct.message);
  if ((activas?.length ?? 0) > 0) {
    const muestra = (activas ?? []).map((o) => o.nombre).join(", ");
    throw new Error(
      `No se puede borrar: la empresa tiene oportunidades ACTIVAS (${activas!.length}). Cerralas o reasignalas primero: ${muestra}.`,
    );
  }

  // 2) Contar lo que se va a borrar (para el toast post-acción).
  const [{ count: contactosCount }, { count: cerradasCount }] = await Promise.all([
    admin.from("contacto").select("id", { count: "exact", head: true }).eq("empresa_id", id),
    admin.from("oportunidad").select("id", { count: "exact", head: true }).eq("empresa_id", id).neq("estado", "activo"),
  ]);

  // 3) Borrar explícitamente las oportunidades cerradas. El FK
  //    oportunidad.empresa_id está como ON DELETE RESTRICT en el schema base
  //    (migración 0002), por lo que un delete directo de la empresa daría
  //    error si queda alguna. Los notas/historial/documentos colgando de
  //    estas oportunidades caen por CASCADE de sus propios FKs.
  if ((cerradasCount ?? 0) > 0) {
    const { error: delOpsErr } = await admin
      .from("oportunidad")
      .delete()
      .eq("empresa_id", id)
      .neq("estado", "activo");
    if (delOpsErr) throw new Error(`No se pudieron borrar oportunidades cerradas: ${delOpsErr.message}`);
  }

  // 4) Borrar la empresa. contacto.empresa_id está como ON DELETE CASCADE,
  //    así que los contactos asociados caen solos.
  const { error: delErr } = await admin.from("empresa").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  return {
    contactos: contactosCount ?? 0,
    oportunidades_cerradas: cerradasCount ?? 0,
  };
}

/**
 * Borrar contacto reasignando sus oportunidades a otro contacto.
 *
 * - Si `reasignarA` está presente: actualiza oportunidad.contacto_id en bloque
 *   antes de borrar (transacción lógica: si la reasignación falla, no borramos).
 * - Si `reasignarA` es null y hay oportunidades activas → error pedido por
 *   el caller para forzar elegir destino.
 * - Notas, documentos, historial: limpieza via ON DELETE CASCADE en la DB
 *   (ver migración 0040). Si no existe el cascade aún, este delete fallará y
 *   devolveremos el error tal cual para que el user corra la migración.
 */
export async function deleteContactoConReasignacion(
  id: string,
  reasignarA: string | null,
): Promise<{ reasignadas: number }> {
  await ensurePermission("contactos", "eliminar");
  const admin = createAdminSupabase();

  // 1) Listar oportunidades vinculadas al contacto (todas, no solo activas:
  //    si dejamos huérfanas las cerradas pierden auditoría).
  const { data: ops, error: listErr } = await admin
    .from("oportunidad")
    .select("id")
    .eq("contacto_id", id);
  if (listErr) throw new Error(listErr.message);
  const opsCount = ops?.length ?? 0;

  if (opsCount > 0) {
    if (!reasignarA) {
      throw new Error(
        `Este contacto tiene ${opsCount} oportunidad(es). Seleccioná un contacto destino para reasignarlas antes de borrar.`,
      );
    }
    // Validar que el destino existe y pertenece al mismo tenant. RLS lo
    // resuelve para usuarios normales, pero usamos admin client así que
    // verificamos manualmente para evitar cross-tenant.
    const { data: destino, error: destErr } = await admin
      .from("contacto")
      .select("id, tenant_id")
      .eq("id", reasignarA)
      .single();
    if (destErr || !destino) throw new Error("Contacto destino no encontrado");

    const { error: srcErr, data: src } = await admin
      .from("contacto")
      .select("tenant_id")
      .eq("id", id)
      .single();
    if (srcErr || !src) throw new Error("Contacto no encontrado");
    if (src.tenant_id !== destino.tenant_id) {
      throw new Error("El contacto destino debe ser del mismo tenant");
    }
    if (reasignarA === id) {
      throw new Error("No podés reasignar al mismo contacto que estás borrando");
    }

    const { error: updErr } = await admin
      .from("oportunidad")
      .update({ contacto_id: reasignarA })
      .eq("contacto_id", id);
    if (updErr) throw new Error(`No se pudieron reasignar las oportunidades: ${updErr.message}`);
  }

  const { error: delErr } = await admin.from("contacto").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  return { reasignadas: opsCount };
}

type OportunidadUpdate = {
  nombre: string;
  empresa_id: string;
  contacto_id: string;
  pipeline_id: string;
  etapa_id: string;
  asignado_id: string | null;
  valor: number | null;
  moneda: string;
  estado: "activo" | "ganado" | "perdido" | "eliminado";
  probabilidad_cierre: number | null;
  fecha_esperada_cierre: string | null;
  motivo_perdida_id: string | null;
  observaciones_perdida: string | null;
  descripcion: string | null;
};

/**
 * Updates an oportunidad. If etapa_id changed, also updates
 * fecha_entrado_etapa to NOW and inserts a row into historial_etapa.
 *
 * Asesores can update only their own oportunidades (RLS enforces it
 * but we also let them through here — see ensureWriter logic).
 */
export async function updateOportunidad(id: string, patch: OportunidadUpdate) {
  const user = await ensurePermission("oportunidades", "editar");

  const supabase = await createServerSupabase();

  // Fetch current to detect etapa / estado change
  const { data: current } = await supabase
    .from("oportunidad")
    .select("etapa_id, asignado_id, estado")
    .eq("id", id)
    .maybeSingle();
  if (!current) throw new Error("Oportunidad no encontrada");

  // Permission gate: admin OR (asesor + asigned to this user)
  if (user.rol !== "admin" && current.asignado_id !== user.id) {
    throw new Error("No tenés permiso para editar esta oportunidad");
  }

  const etapaChanged = current.etapa_id !== patch.etapa_id;

  const updateBody: Record<string, unknown> = { ...patch };
  if (etapaChanged) {
    updateBody.fecha_entrado_etapa = new Date().toISOString();
  }

  const { error } = await supabase.from("oportunidad").update(updateBody).eq("id", id);
  if (error) throw new Error(error.message);

  if (etapaChanged) {
    await supabase.from("historial_etapa").insert({
      tenant_id: user.tenantId,
      oportunidad_id: id,
      etapa_anterior: current.etapa_id,
      etapa_nueva: patch.etapa_id,
      cambiado_por: user.id,
    });
  }

  // Automation events
  if (user.tenantId) {
    if (etapaChanged) {
      await ejecutarReglas("etapa_cambiada", { oportunidadId: id, tenantId: user.tenantId, etapaId: patch.etapa_id });
    }
    if (patch.estado !== current.estado && (patch.estado === "ganado" || patch.estado === "perdido")) {
      await ejecutarReglas(
        patch.estado === "ganado" ? "oportunidad_ganada" : "oportunidad_perdida",
        { oportunidadId: id, tenantId: user.tenantId },
      );
      await dispatchWebhook(
        user.tenantId,
        patch.estado === "ganado" ? "oportunidad.ganada" : "oportunidad.perdida",
        { id, nombre: patch.nombre, valor: patch.valor },
      );
    }
    if (etapaChanged) {
      await dispatchWebhook(user.tenantId, "oportunidad.etapa_cambiada", { id, etapa_id: patch.etapa_id });
    }
  }
}

/**
 * Move an opportunity to a different etapa (used by the kanban drag&drop).
 * Lighter than updateOportunidad — only touches etapa_id + fecha + history.
 *
 * Optimized for the kanban: after the auth-gating SELECT, runs the UPDATE
 * and the historial_etapa INSERT in parallel since they're independent.
 * Cuts the move from 3 sequential round-trips (~400ms) down to 2 (~250ms).
 */
export async function moveOportunidadToEtapa(opts: {
  oportunidad_id: string;
  etapa_id: string;
}) {
  const user = await ensurePermission("oportunidades", "editar");
  const supabase = await createServerSupabase();

  const { data: current } = await supabase
    .from("oportunidad")
    .select("etapa_id, asignado_id, pipeline_id")
    .eq("id", opts.oportunidad_id)
    .maybeSingle();
  if (!current) throw new Error("Oportunidad no encontrada");
  if (user.rol !== "admin" && current.asignado_id !== user.id) {
    throw new Error("No tenés permiso para mover esta oportunidad");
  }
  if (current.etapa_id === opts.etapa_id) return; // no-op

  const now = new Date().toISOString();
  const [updateRes] = await Promise.all([
    supabase
      .from("oportunidad")
      .update({ etapa_id: opts.etapa_id, fecha_entrado_etapa: now })
      .eq("id", opts.oportunidad_id),
    supabase.from("historial_etapa").insert({
      tenant_id: user.tenantId,
      oportunidad_id: opts.oportunidad_id,
      etapa_anterior: current.etapa_id,
      etapa_nueva: opts.etapa_id,
      cambiado_por: user.id,
    }),
  ]);
  if (updateRes.error) throw new Error(updateRes.error.message);
  if (user.tenantId) {
    await ejecutarReglas("etapa_cambiada", {
      oportunidadId: opts.oportunidad_id,
      tenantId: user.tenantId,
      etapaId: opts.etapa_id,
    });
  }
}

export type NewOportunidad = OportunidadUpdate;

export async function createOportunidad(
  input: NewOportunidad,
  camposCustom: Record<string, unknown> = {},
): Promise<string> {
  const user = await ensurePermission("oportunidades", "crear");
  if (!user.tenantId) throw new Error("Tenant ausente");

  const admin = createAdminSupabase();
  const asignado = await resolverAsesor(user.tenantId, input.asignado_id);
  const payload = { ...input, asignado_id: asignado, campos_custom: camposCustom, tenant_id: user.tenantId, creado_por: user.id };
  let { data, error } = await admin.from("oportunidad").insert(payload).select("id").single();
  // Fallback if migration 0010 (creado_por) hasn't been applied yet.
  if (error && /creado_por/.test(error.message)) {
    const { creado_por, ...rest } = payload;
    ({ data, error } = await admin.from("oportunidad").insert(rest).select("id").single());
  }
  if (error) throw new Error(error.message);
  await ejecutarReglas("oportunidad_creada", { oportunidadId: data!.id, tenantId: user.tenantId });
  await dispatchWebhook(user.tenantId, "oportunidad.creada", { id: data!.id, nombre: input.nombre, valor: input.valor });
  return data!.id;
}

export async function patchOportunidad(id: string, patch: Record<string, unknown>) {
  await ensurePermission("oportunidades", "editar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("oportunidad").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Pipelines / etapas ----------
export async function createPipeline(input: { nombre: string; descripcion: string | null }): Promise<string> {
  await ensureWriter();
  const user = await getSessionUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pipeline")
    .insert({ ...input, tenant_id: user!.tenantId, creado_por: user!.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updatePipeline(id: string, patch: { nombre: string; descripcion: string | null }) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("pipeline").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePipeline(id: string) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  // Block deletion if it has opportunities
  const { count } = await supabase
    .from("oportunidad")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", id);
  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar: el pipeline tiene oportunidades asociadas");
  }
  const { error } = await supabase.from("pipeline").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createEtapa(input: {
  pipeline_id: string;
  nombre: string;
  orden: number;
  dias_maximo_alerta: number | null;
}): Promise<string> {
  await ensureWriter();
  const user = await getSessionUser();
  const supabase = await createServerSupabase();

  // Calcular el siguiente orden a partir de la última etapa del embudo (ignora
  // el `orden` que mande el cliente; evita choques de uniqueness y race
  // conditions cuando el front todavía no refrescó su estado local).
  const { data: ultima } = await supabase
    .from("etapa_pipeline")
    .select("orden")
    .eq("pipeline_id", input.pipeline_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const siguienteOrden = ((ultima?.orden as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("etapa_pipeline")
    .insert({
      pipeline_id: input.pipeline_id,
      nombre: input.nombre,
      dias_maximo_alerta: input.dias_maximo_alerta,
      orden: siguienteOrden,
      tenant_id: user!.tenantId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateEtapa(
  id: string,
  patch: { nombre: string; orden: number; dias_maximo_alerta: number | null },
) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("etapa_pipeline").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEtapa(id: string) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("oportunidad")
    .select("id", { count: "exact", head: true })
    .eq("etapa_id", id);
  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar: la etapa tiene oportunidades. Movelas a otra etapa primero.");
  }
  const { error } = await supabase.from("etapa_pipeline").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderEtapas(pipeline_id: string, orderedIds: string[]) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("etapa_pipeline")
      .update({ orden: i })
      .eq("id", orderedIds[i])
      .eq("pipeline_id", pipeline_id);
    if (error) throw new Error(error.message);
  }
}

// ---------- Actividades ----------
type NewActividad = {
  oportunidad_id: string;
  tipo: "llamada" | "email" | "whatsapp" | "reunion" | "otra";
  descripcion: string | null;
  fecha_programada: string | null;
  completada: boolean;
};

export async function createActividad(input: NewActividad): Promise<string> {
  const user = await ensureSession();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("actividad")
    .insert({
      tenant_id: user.tenantId,
      oportunidad_id: input.oportunidad_id,
      tipo: input.tipo,
      descripcion: input.descripcion,
      fecha_programada: input.fecha_programada,
      completada: input.completada,
      fecha_completada: input.completada ? new Date().toISOString() : null,
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function toggleActividad(id: string, completada: boolean) {
  await ensureSession();
  const supabase = await createServerSupabase();
  // Tomamos el oportunidad_id ANTES de la mutación. Si la actividad se borra
  // en otro request entre UPDATE y SELECT, perdíamos el log.
  const { data: act } = await supabase.from("actividad").select("oportunidad_id").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("actividad")
    .update({
      completada,
      fecha_completada: completada ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (act?.oportunidad_id)
    await logCambio("oportunidad", act.oportunidad_id, completada ? "Completó una actividad" : "Reabrió una actividad");
}

export async function deleteActividad(id: string) {
  await ensureSession();
  const supabase = await createServerSupabase();
  const { data: act } = await supabase.from("actividad").select("oportunidad_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("actividad").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (act?.oportunidad_id) await logCambio("oportunidad", act.oportunidad_id, "Eliminó una actividad");
}

// ---------- Notas ----------
type NewNota = {
  tipo: "empresa" | "contacto" | "oportunidad";
  empresa_id: string | null;
  contacto_id: string | null;
  oportunidad_id: string | null;
  contenido: string;
};

export async function createNota(input: NewNota): Promise<string> {
  const user = await ensureSession();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("nota")
    .insert({
      tenant_id: user.tenantId,
      tipo: input.tipo,
      empresa_id: input.empresa_id,
      contacto_id: input.contacto_id,
      oportunidad_id: input.oportunidad_id,
      contenido: input.contenido,
      creado_por: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteNota(id: string) {
  await ensureSession();
  const supabase = await createServerSupabase();
  const { data: nota } = await supabase
    .from("nota")
    .select("empresa_id, contacto_id, oportunidad_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("nota").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (nota) {
    const entidad = nota.oportunidad_id
      ? "oportunidad"
      : nota.contacto_id
        ? "contacto"
        : nota.empresa_id
          ? "empresa"
          : null;
    const eid = nota.oportunidad_id ?? nota.contacto_id ?? nota.empresa_id;
    if (entidad && eid) await logCambio(entidad, eid, "Eliminó una nota");
  }
}

// ---------- Usuarios (admin) ----------
type NewUsuario = {
  nombre: string;
  email: string;
  password: string;
  rol: "admin" | "asesor";
};

export async function createUsuario(input: NewUsuario): Promise<string> {
  const caller = await ensureWriter();
  const admin = createAdminSupabase();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { nombre: input.nombre, tenant_id: caller.tenantId, rol: input.rol },
  });
  if (authErr || !created.user) {
    throw new Error(`No se pudo crear usuario: ${authErr?.message ?? "sin detalle"}`);
  }

  const { error: insErr } = await admin.from("usuario").insert({
    id: created.user.id,
    tenant_id: caller.tenantId,
    nombre: input.nombre,
    email: input.email,
    rol: input.rol,
    activo: true,
  });
  if (insErr) {
    // Roll back the auth user to avoid orphans
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`No se pudo insertar usuario: ${insErr.message}`);
  }

  return created.user.id;
}

type UsuarioUpdate = {
  nombre: string;
  rol: "admin" | "asesor";
  activo: boolean;
  password?: string;
};

export async function updateUsuario(id: string, patch: UsuarioUpdate) {
  const caller = await ensureWriter();
  const admin = createAdminSupabase();

  // Defensa: verificar que el usuario a editar pertenece al mismo tenant que el admin.
  const { data: target } = await admin
    .from("usuario")
    .select("id, tenant_id")
    .eq("id", id)
    .eq("tenant_id", caller.tenantId!)
    .maybeSingle();
  if (!target) throw new Error("Usuario no encontrado en tu cuenta");

  // Lockout protection: don't let admin demote/deactivate themselves
  if (id === caller.id && (patch.rol !== "admin" || !patch.activo)) {
    throw new Error("No podés desactivarte ni quitarte el rol de admin a vos mismo");
  }

  const { error } = await admin
    .from("usuario")
    .update({ nombre: patch.nombre, rol: patch.rol, activo: patch.activo })
    .eq("id", id)
    .eq("tenant_id", caller.tenantId!);
  if (error) throw new Error(error.message);

  if (patch.password && patch.password.length >= 8) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, {
      password: patch.password,
    });
    if (pwErr) throw new Error(pwErr.message);
  }

  // Keep user_metadata in sync so a future auth hook re-read sees the new values
  await admin.auth.admin.updateUserById(id, {
    user_metadata: { nombre: patch.nombre, tenant_id: caller.tenantId, rol: patch.rol },
  });
}

// ---------- Sedes ----------
type SedeInput = {
  empresa_id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  es_principal: boolean;
};

export async function createSede(input: SedeInput): Promise<string> {
  const user = await ensurePermission("empresas", "editar");
  const supabase = await createServerSupabase();
  // Ensure at most one principal per empresa
  if (input.es_principal) {
    await supabase.from("sede").update({ es_principal: false }).eq("empresa_id", input.empresa_id);
  }
  const { data, error } = await supabase
    .from("sede")
    .insert({ ...input, tenant_id: user.tenantId, creado_por: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateSede(id: string, patch: Omit<SedeInput, "empresa_id">) {
  await ensurePermission("empresas", "editar");
  const supabase = await createServerSupabase();
  if (patch.es_principal) {
    const { data: current } = await supabase
      .from("sede")
      .select("empresa_id")
      .eq("id", id)
      .maybeSingle();
    if (current) {
      await supabase
        .from("sede")
        .update({ es_principal: false })
        .eq("empresa_id", current.empresa_id)
        .neq("id", id);
    }
  }
  const { error } = await supabase.from("sede").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSede(id: string) {
  await ensurePermission("empresas", "eliminar");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("sede").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Motivos de pérdida (admin) ----------
export async function createMotivoPerdida(nombre: string): Promise<string> {
  const user = await ensureWriter();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("motivo_perdida")
    .insert({ tenant_id: user.tenantId, nombre, creado_por: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateMotivoPerdida(id: string, nombre: string) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("motivo_perdida").update({ nombre }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMotivoPerdida(id: string) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("oportunidad")
    .select("id", { count: "exact", head: true })
    .eq("motivo_perdida_id", id);
  if ((count ?? 0) > 0) {
    throw new Error("No se puede eliminar: hay oportunidades usando este motivo");
  }
  const { error } = await supabase.from("motivo_perdida").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Campos personalizados (admin) ----------
type NewCampoPersonalizado = {
  tipo_entidad: "empresa" | "contacto" | "oportunidad";
  clave: string;
  etiqueta: string;
  etiqueta_en: string | null;
  tipo: "texto" | "numero" | "moneda" | "fecha" | "seleccion" | "checkbox" | "textarea";
  opciones: string[] | null;
  requerido: boolean;
  orden: number;
};

export async function createCampoPersonalizado(input: NewCampoPersonalizado): Promise<string> {
  const user = await ensureWriter();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("campo_personalizado")
    .insert({ ...input, tenant_id: user.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCampoPersonalizado(id: string, patch: Partial<NewCampoPersonalizado>) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("campo_personalizado").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCampoPersonalizado(id: string) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("campo_personalizado").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Toggle whether a custom field appears in the create/edit popup. */
export async function setCampoMostrarEnForm(id: string, value: boolean) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("campo_personalizado")
    .update({ mostrar_en_form: value })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Patches the campos_custom JSONB column on a single entity row.
 * Merges with existing values (does not replace the whole object).
 */
export async function updateCamposCustom(args: {
  tipo_entidad: "empresa" | "contacto" | "oportunidad";
  entity_id: string;
  values: Record<string, unknown>;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  const supabase = await createServerSupabase();
  const table = args.tipo_entidad;

  const { data: current } = await supabase
    .from(table)
    .select("campos_custom")
    .eq("id", args.entity_id)
    .maybeSingle();
  const next = { ...((current?.campos_custom as Record<string, unknown> | null) ?? {}), ...args.values };

  const { error } = await supabase.from(table).update({ campos_custom: next }).eq("id", args.entity_id);
  if (error) throw new Error(error.message);
}
