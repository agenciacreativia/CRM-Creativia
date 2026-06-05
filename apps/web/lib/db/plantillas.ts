import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type PlantillaCorreo = {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo_html: string;
};

/** Email templates for the current tenant. Defensive: [] if table missing. */
export async function listPlantillas(): Promise<PlantillaCorreo[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("plantilla_correo")
    .select("id, nombre, asunto, cuerpo_html")
    .order("nombre", { ascending: true });
  if (error) return [];
  return (data ?? []) as PlantillaCorreo[];
}
