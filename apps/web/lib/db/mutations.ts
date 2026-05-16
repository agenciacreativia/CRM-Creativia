import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

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
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("empresa").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
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
};

export async function updateContacto(id: string, patch: ContactoUpdate) {
  await ensureWriter();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("contacto").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
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
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");

  const supabase = await createServerSupabase();

  // Fetch current to detect etapa change
  const { data: current } = await supabase
    .from("oportunidad")
    .select("etapa_id, asignado_id")
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
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
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
}

export type NewOportunidad = OportunidadUpdate;

export async function createOportunidad(input: NewOportunidad): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("No autenticado");
  if (!user.tenantId) throw new Error("Tenant ausente");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("oportunidad")
    .insert({ ...input, tenant_id: user.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
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
  const { data, error } = await supabase
    .from("etapa_pipeline")
    .insert({ ...input, tenant_id: user!.tenantId })
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
  const { error } = await supabase
    .from("actividad")
    .update({
      completada,
      fecha_completada: completada ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteActividad(id: string) {
  await ensureSession();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("actividad").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
  const { error } = await supabase.from("nota").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

  // Lockout protection: don't let admin demote/deactivate themselves
  if (id === caller.id && (patch.rol !== "admin" || !patch.activo)) {
    throw new Error("No podés desactivarte ni quitarte el rol de admin a vos mismo");
  }

  const { error } = await admin
    .from("usuario")
    .update({ nombre: patch.nombre, rol: patch.rol, activo: patch.activo })
    .eq("id", id);
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
  const user = await ensureWriter();
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
  await ensureWriter();
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
  await ensureWriter();
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
