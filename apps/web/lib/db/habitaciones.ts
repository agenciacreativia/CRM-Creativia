import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import type { TipoHabitacion } from "@/lib/habitaciones-types";

export type Habitacion = { id: string; tipo: TipoHabitacion; orden: number };

export async function listHabitaciones(oportunidadId: string): Promise<Habitacion[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("habitacion")
    .select("id, tipo, orden")
    .eq("oportunidad_id", oportunidadId)
    .order("orden", { ascending: true });
  if (error) return [];
  return (data ?? []) as Habitacion[];
}

export async function crearHabitacion(oportunidadId: string, tipo: TipoHabitacion): Promise<string> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const { data: ult } = await supabase
    .from("habitacion")
    .select("orden")
    .eq("oportunidad_id", oportunidadId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = ((ult?.orden as number) ?? 0) + 1;
  const { data, error } = await supabase
    .from("habitacion")
    .insert({ tenant_id: user.tenantId, oportunidad_id: oportunidadId, tipo, orden })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function eliminarHabitacion(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("habitacion").delete().eq("id", id).eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}

export async function asignarPasajeroHabitacion(pasajeroId: string, habitacionId: string | null): Promise<void> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("pasajero").update({ habitacion_id: habitacionId }).eq("id", pasajeroId).eq("tenant_id", user.tenantId);
  if (error) throw new Error(error.message);
}
