import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type Notificacion = {
  id: string;
  tipo: "vencida" | "hoy" | "estancada";
  titulo: string;
  descripcion: string;
  href: string;
  fecha: string;
};

const TIPO_ACT: Record<string, string> = {
  llamada: "Llamada",
  email: "Correo",
  reunion: "Reunión",
  whatsapp: "Mensaje",
  otra: "Tarea",
};

/**
 * Derived notification feed for the signed-in user — no table needed.
 * Surfaces overdue / due-today activities on the user's opportunities and
 * stalled opportunities. RLS already scopes opportunities to the user.
 */
export async function getNotificaciones(): Promise<Notificacion[]> {
  try {
    const user = await getSessionUser();
    if (!user) return [];
    const supabase = await createServerSupabase();

    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const items: Notificacion[] = [];

    // --- Overdue / due-today activities ---
    const { data: acts } = await supabase
      .from("actividad")
      .select("id, tipo, descripcion, fecha_programada, oportunidad_id, oportunidad(nombre, asignado_id)")
      .eq("completada", false)
      .lte("fecha_programada", endOfToday.toISOString())
      .order("fecha_programada", { ascending: true })
      .limit(20);

    for (const a of acts ?? []) {
      const opp = Array.isArray(a.oportunidad) ? a.oportunidad[0] : a.oportunidad;
      if (user.rol !== "admin" && opp?.asignado_id !== user.id) continue;
      const fecha = a.fecha_programada as string;
      const vencida = new Date(fecha) < startOfDay;
      items.push({
        id: `act-${a.id}`,
        tipo: vencida ? "vencida" : "hoy",
        titulo: `${TIPO_ACT[a.tipo as string] ?? "Actividad"} ${vencida ? "vencida" : "para hoy"}`,
        descripcion: (a.descripcion as string) || opp?.nombre || "Actividad pendiente",
        href: `/oportunidades/${a.oportunidad_id}`,
        fecha,
      });
    }

    // Vencidas primero, luego por fecha.
    items.sort((x, y) => {
      if (x.tipo !== y.tipo) return x.tipo === "vencida" ? -1 : 1;
      return x.fecha.localeCompare(y.fecha);
    });

    return items.slice(0, 12);
  } catch {
    return [];
  }
}
