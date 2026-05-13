import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type ActividadTipo = "llamada" | "email" | "whatsapp" | "reunion" | "otra";

export type Actividad = {
  id: string;
  oportunidad_id: string;
  tipo: ActividadTipo;
  descripcion: string | null;
  completada: boolean;
  fecha_programada: string | null;
  fecha_completada: string | null;
  creado_por: string | null;
  creado_por_nombre: string | null;
  creado_en: string;
};

export async function listActividades(oportunidad_id: string): Promise<Actividad[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("actividad")
    .select("*, usuario(nombre)")
    .eq("oportunidad_id", oportunidad_id)
    .order("completada", { ascending: true })
    .order("fecha_programada", { ascending: true, nullsFirst: false })
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; oportunidad_id: string; tipo: ActividadTipo; descripcion: string | null; completada: boolean; fecha_programada: string | null; fecha_completada: string | null; creado_por: string | null; creado_en: string; usuario: { nombre: string } | { nombre: string }[] | null }) => {
    const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
    return {
      id: row.id,
      oportunidad_id: row.oportunidad_id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      completada: row.completada,
      fecha_programada: row.fecha_programada,
      fecha_completada: row.fecha_completada,
      creado_por: row.creado_por,
      creado_por_nombre: u?.nombre ?? null,
      creado_en: row.creado_en,
    };
  });
}
