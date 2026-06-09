import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import type { PasoSecuencia } from "@/lib/secuencias-types";

export type Secuencia = {
  id: string;
  nombre: string;
  descripcion: string | null;
  pasos: PasoSecuencia[];
  activo: boolean;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

/** Sequences for the tenant. Defensive: [] pre-0026. */
export async function listSecuencias(soloActivas = false): Promise<Secuencia[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from("secuencia").select("id, nombre, descripcion, pasos, activo").order("nombre");
  if (soloActivas) query = query.eq("activo", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Secuencia[];
}

export type SecuenciaInput = { nombre: string; descripcion: string | null; pasos: PasoSecuencia[]; activo: boolean };

export async function createSecuencia(input: SecuenciaInput): Promise<string> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("secuencia")
    .insert({ ...input, tenant_id: caller.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateSecuencia(id: string, input: SecuenciaInput): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("secuencia").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSecuencia(id: string): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("secuencia").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Enroll an opportunity in a sequence: generate one dated activity per step.
 * Returns the number of activities created.
 */
export async function inscribirEnSecuencia(secuenciaId: string, oportunidadId: string): Promise<number> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const admin = createAdminSupabase();

  const { data: sec } = await admin.from("secuencia").select("pasos").eq("id", secuenciaId).eq("tenant_id", user.tenantId).maybeSingle();
  if (!sec) throw new Error("Secuencia no encontrada");
  const pasos = (sec.pasos ?? []) as PasoSecuencia[];
  if (pasos.length === 0) return 0;

  const tiposValidos: PasoSecuencia["actividad_tipo"][] = ["llamada", "email", "whatsapp", "reunion", "otra"];

  const filas = pasos.map((p, idx) => {
    if (!tiposValidos.includes(p.actividad_tipo)) {
      throw new Error(`Paso ${idx + 1} tiene un tipo de actividad inválido: ${p.actividad_tipo}`);
    }
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + (Number(p.dias) || 0));
    return {
      tenant_id: user.tenantId,
      oportunidad_id: oportunidadId,
      tipo: p.actividad_tipo,
      descripcion: p.descripcion || "Paso de secuencia",
      completada: false,
      fecha_programada: fecha.toISOString(),
      creado_por: user.id,
    };
  });
  const { error } = await admin.from("actividad").insert(filas);
  if (error) throw new Error(error.message);
  return filas.length;
}
