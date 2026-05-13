import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type TipoEntidad = "empresa" | "contacto" | "oportunidad";
export type TipoCampo = "texto" | "numero" | "moneda" | "fecha" | "seleccion" | "checkbox" | "textarea";

export type CampoPersonalizado = {
  id: string;
  tipo_entidad: TipoEntidad;
  clave: string;
  etiqueta: string;
  etiqueta_en: string | null;
  tipo: TipoCampo;
  opciones: string[] | null;
  requerido: boolean;
  orden: number;
  creado_en: string;
};

export async function listCampos(tipo_entidad?: TipoEntidad): Promise<CampoPersonalizado[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("campo_personalizado")
    .select("*")
    .order("tipo_entidad")
    .order("orden");
  if (tipo_entidad) query = query.eq("tipo_entidad", tipo_entidad);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CampoPersonalizado[];
}
