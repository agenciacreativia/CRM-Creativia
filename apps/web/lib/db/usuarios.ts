import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type UsuarioRow = {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "asesor";
  activo: boolean;
  idioma_preferido: "es" | "en";
  ultimo_acceso: string | null;
  creado_en: string;
  oportunidades_activas: number;
};

export async function listUsuarios(): Promise<UsuarioRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("usuario")
    .select("*, oportunidad(count)")
    .order("activo", { ascending: false })
    .order("rol")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((u: { id: string; nombre: string; email: string; rol: "admin" | "asesor"; activo: boolean; idioma_preferido: "es" | "en"; ultimo_acceso: string | null; creado_en: string; oportunidad?: { count: number }[] }) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
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
    .select("*, oportunidad(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    email: data.email,
    rol: data.rol,
    activo: data.activo,
    idioma_preferido: data.idioma_preferido,
    ultimo_acceso: data.ultimo_acceso,
    creado_en: data.creado_en,
    oportunidades_activas: data.oportunidad?.[0]?.count ?? 0,
  };
}
