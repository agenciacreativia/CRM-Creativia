import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type UsuarioRow = {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "asesor";
  rol_id: string | null;
  activo: boolean;
  idioma_preferido: "es" | "en";
  ultimo_acceso: string | null;
  creado_en: string;
  oportunidades_activas: number;
};

export async function listUsuarios(
  opts: { q?: string; rol?: string; activo?: string } = {},
): Promise<UsuarioRow[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("usuario")
    .select("*, oportunidad!oportunidad_asignado_id_fkey(count)")
    .order("activo", { ascending: false })
    .order("rol")
    .order("nombre");

  if (opts.q) {
    const s = `%${opts.q}%`;
    query = query.or(`nombre.ilike.${s},email.ilike.${s}`);
  }
  if (opts.rol && opts.rol !== "todos") {
    query = query.eq("rol", opts.rol);
  }
  if (opts.activo === "activos") {
    query = query.eq("activo", true);
  } else if (opts.activo === "inactivos") {
    query = query.eq("activo", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((u: { id: string; nombre: string; email: string; rol: "admin" | "asesor"; rol_id: string | null; activo: boolean; idioma_preferido: "es" | "en"; ultimo_acceso: string | null; creado_en: string; oportunidad?: { count: number }[] }) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    rol_id: u.rol_id ?? null,
    activo: u.activo,
    idioma_preferido: u.idioma_preferido,
    ultimo_acceso: u.ultimo_acceso,
    creado_en: u.creado_en,
    oportunidades_activas: u.oportunidad?.[0]?.count ?? 0,
  }));
}

export async function getUsuario(id: string): Promise<UsuarioRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("usuario")
    .select("*, oportunidad!oportunidad_asignado_id_fkey(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    email: data.email,
    rol: data.rol,
    rol_id: data.rol_id ?? null,
    activo: data.activo,
    idioma_preferido: data.idioma_preferido,
    ultimo_acceso: data.ultimo_acceso,
    creado_en: data.creado_en,
    oportunidades_activas: data.oportunidad?.[0]?.count ?? 0,
  };
}
