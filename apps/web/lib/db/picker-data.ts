import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type PickerData = {
  empresas: { id: string; nombre: string }[];
  contactos: { id: string; nombre: string; empresa_id: string }[];
  pipelines: { id: string; nombre: string; es_default: boolean }[];
  etapas: { id: string; nombre: string; pipeline_id: string; orden: number }[];
  usuarios: { id: string; nombre: string; rol: "admin" | "asesor" }[];
  motivos: { id: string; nombre: string }[];
};

/**
 * Loads all reference data needed by the oportunidad create/edit forms.
 * One round-trip, no joins — picker UIs filter client-side.
 */
export async function loadPickerData(): Promise<PickerData> {
  const supabase = await createServerSupabase();
  const [{ data: empresas }, { data: contactos }, { data: pipelines }, { data: etapas }, { data: usuarios }, { data: motivos }] =
    await Promise.all([
      supabase.from("empresa").select("id, nombre").order("nombre"),
      supabase.from("contacto").select("id, nombre, empresa_id").order("nombre"),
      supabase
        .from("pipeline")
        .select("id, nombre, es_default")
        .order("es_default", { ascending: false })
        .order("nombre"),
      supabase
        .from("etapa_pipeline")
        .select("id, nombre, pipeline_id, orden")
        .order("orden"),
      supabase.from("usuario").select("id, nombre, rol").eq("activo", true).order("nombre"),
      supabase.from("motivo_perdida").select("id, nombre").order("nombre"),
    ]);
  return {
    empresas: empresas ?? [],
    contactos: contactos ?? [],
    pipelines: pipelines ?? [],
    etapas: etapas ?? [],
    usuarios: usuarios ?? [],
    motivos: motivos ?? [],
  };
}
