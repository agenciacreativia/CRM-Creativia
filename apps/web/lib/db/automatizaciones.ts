import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import type { AccionAutomatizacion, EventoAutomatizacion } from "@/lib/automatizaciones-types";

export type Regla = {
  id: string;
  nombre: string;
  evento: EventoAutomatizacion;
  etapa_id: string | null;
  acciones: AccionAutomatizacion[];
  activo: boolean;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

/** All rules for the tenant. Defensive: [] pre-0025. */
export async function listReglas(): Promise<Regla[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("regla_automatizacion")
    .select("id, nombre, evento, etapa_id, acciones, activo")
    .order("creado_en", { ascending: true });
  if (error) return [];
  return (data ?? []) as Regla[];
}

/** All stages (with pipeline name) for the rule condition selector. */
export async function listEtapasParaReglas(): Promise<{ id: string; nombre: string; pipeline_nombre: string }[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("etapa_pipeline")
    .select("id, nombre, orden, pipeline(nombre)")
    .order("orden", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r: { id: string; nombre: string; pipeline: { nombre: string } | { nombre: string }[] | null }) => {
    const p = Array.isArray(r.pipeline) ? r.pipeline[0] : r.pipeline;
    return { id: r.id, nombre: r.nombre, pipeline_nombre: p?.nombre ?? "" };
  });
}

export type ReglaInput = {
  nombre: string;
  evento: EventoAutomatizacion;
  etapa_id: string | null;
  acciones: AccionAutomatizacion[];
  activo: boolean;
};

export async function createRegla(input: ReglaInput): Promise<string> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("regla_automatizacion")
    .insert({ ...input, tenant_id: caller.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateRegla(id: string, input: ReglaInput): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("regla_automatizacion").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRegla(id: string): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("regla_automatizacion").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Run all active rules matching an event. Best-effort: never throws so it
 * can't break the triggering mutation. Uses admin client (actions may touch
 * records beyond the actor's own scope).
 */
export async function ejecutarReglas(
  evento: EventoAutomatizacion,
  ctx: { oportunidadId: string; tenantId: string; etapaId?: string | null },
): Promise<void> {
  try {
    const actor = await getSessionUser();
    const admin = createAdminSupabase();
    const { data: reglas } = await admin
      .from("regla_automatizacion")
      .select("etapa_id, acciones")
      .eq("tenant_id", ctx.tenantId)
      .eq("evento", evento)
      .eq("activo", true);

    for (const regla of reglas ?? []) {
      // Stage-entered rules can target a specific stage (or any if null).
      if (evento === "etapa_cambiada" && regla.etapa_id && regla.etapa_id !== ctx.etapaId) continue;
      const acciones = (regla.acciones ?? []) as AccionAutomatizacion[];
      for (const accion of acciones) {
        try {
          if (accion.tipo === "crear_actividad") {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + (Number(accion.dias) || 0));
            await admin.from("actividad").insert({
              tenant_id: ctx.tenantId,
              oportunidad_id: ctx.oportunidadId,
              tipo: accion.actividad_tipo,
              descripcion: accion.descripcion || "Tarea automática",
              completada: false,
              fecha_programada: fecha.toISOString(),
              creado_por: actor?.id ?? null,
            });
          } else if (accion.tipo === "asignar") {
            await admin.from("oportunidad").update({ asignado_id: accion.usuario_id }).eq("id", ctx.oportunidadId);
          } else if (accion.tipo === "etiquetar") {
            await admin
              .from("oportunidad_etiqueta")
              .upsert(
                { oportunidad_id: ctx.oportunidadId, etiqueta_id: accion.etiqueta_id, tenant_id: ctx.tenantId },
                { onConflict: "oportunidad_id,etiqueta_id" },
              );
          }
        } catch {
          /* one bad action shouldn't stop the rest */
        }
      }
    }
  } catch {
    /* automation must never break the core operation */
  }
}
