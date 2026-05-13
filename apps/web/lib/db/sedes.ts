import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type Sede = {
  id: string;
  empresa_id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  es_principal: boolean;
  creado_en: string;
};

export async function listSedes(empresa_id: string): Promise<Sede[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("sede")
    .select("id, empresa_id, nombre, direccion, ciudad, pais, telefono, email, es_principal, creado_en")
    .eq("empresa_id", empresa_id)
    .order("es_principal", { ascending: false })
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}
