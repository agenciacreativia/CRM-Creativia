import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type AgendaEvent = {
  id: string;
  oportunidad_id: string;
  oportunidad_nombre: string;
  asignado_id: string | null;
  asignado_nombre: string | null;
  tipo: "llamada" | "email" | "whatsapp" | "reunion" | "otra";
  descripcion: string | null;
  completada: boolean;
  fecha_programada: string; // ISO
};

/**
 * Loads activities with a programada date in [from, to] for the agenda view.
 * Asesores only see activities from their own oportunidades.
 */
export async function loadAgendaRange(args: {
  from: string; // YYYY-MM-DD
  to: string;
  scope?: "all" | "me";
}): Promise<AgendaEvent[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createServerSupabase();

  let query = supabase
    .from("actividad")
    .select(
      "id, oportunidad_id, tipo, descripcion, completada, fecha_programada, oportunidad(nombre, asignado_id, usuario(nombre))",
    )
    .gte("fecha_programada", `${args.from}T00:00:00Z`)
    .lte("fecha_programada", `${args.to}T23:59:59Z`)
    .order("fecha_programada", { ascending: true });

  const { data, error } = await query;
  if (error) throw error;

  type Raw = {
    id: string;
    oportunidad_id: string;
    tipo: AgendaEvent["tipo"];
    descripcion: string | null;
    completada: boolean;
    fecha_programada: string;
    oportunidad: {
      nombre: string;
      asignado_id: string | null;
      usuario: { nombre: string } | { nombre: string }[] | null;
    } | Array<{
      nombre: string;
      asignado_id: string | null;
      usuario: { nombre: string } | { nombre: string }[] | null;
    }> | null;
  };

  const events: AgendaEvent[] = ((data ?? []) as Raw[]).flatMap((row) => {
    const opp = Array.isArray(row.oportunidad) ? row.oportunidad[0] : row.oportunidad;
    if (!opp) return [];
    const u = Array.isArray(opp.usuario) ? opp.usuario[0] : opp.usuario;
    return [
      {
        id: row.id,
        oportunidad_id: row.oportunidad_id,
        oportunidad_nombre: opp.nombre,
        asignado_id: opp.asignado_id,
        asignado_nombre: u?.nombre ?? null,
        tipo: row.tipo,
        descripcion: row.descripcion,
        completada: row.completada,
        fecha_programada: row.fecha_programada,
      },
    ];
  });

  if (args.scope === "me") {
    return events.filter((e) => e.asignado_id === user.id);
  }
  return events;
}
