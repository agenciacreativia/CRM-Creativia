import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

async function ensureWriter() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores pueden editar");
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

  const { error } = await supabase
    .from("oportunidad")
    .update({
      etapa_id: opts.etapa_id,
      fecha_entrado_etapa: new Date().toISOString(),
    })
    .eq("id", opts.oportunidad_id);
  if (error) throw new Error(error.message);

  await supabase.from("historial_etapa").insert({
    tenant_id: user.tenantId,
    oportunidad_id: opts.oportunidad_id,
    etapa_anterior: current.etapa_id,
    etapa_nueva: opts.etapa_id,
    cambiado_por: user.id,
  });
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
