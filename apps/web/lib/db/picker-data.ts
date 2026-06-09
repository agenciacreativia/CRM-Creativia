import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CampoPersonalizado } from "@/lib/db/campos";

export type PickerData = {
  empresas: { id: string; nombre: string }[];
  contactos: { id: string; nombre: string; empresa_id: string }[];
  pipelines: { id: string; nombre: string; es_default: boolean }[];
  etapas: { id: string; nombre: string; pipeline_id: string; orden: number }[];
  usuarios: { id: string; nombre: string; rol: "admin" | "asesor" }[];
  motivos: { id: string; nombre: string }[];
  campos: CampoPersonalizado[];
};

/**
 * Loads all reference data needed by the oportunidad create/edit forms.
 * One round-trip, no joins — picker UIs filter client-side.
 */
export async function loadPickerData(): Promise<PickerData> {
  const supabase = await createServerSupabase();
  const queries = await Promise.all([
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
    supabase.from("campo_personalizado").select("*").order("orden"),
  ]);
  // Log errores en vez de tragarlos silenciosamente — facilita el diagnóstico
  // cuando una RLS o una columna nueva rompe los pickers.
  const labels = ["empresa", "contacto", "pipeline", "etapa_pipeline", "usuario", "motivo_perdida", "campo_personalizado"];
  queries.forEach((r, i) => {
    if (r.error) console.error(`[picker-data] ${labels[i]}:`, r.error.message);
  });
  const [{ data: empresas }, { data: contactos }, { data: pipelines }, { data: etapas }, { data: usuarios }, { data: motivos }, { data: campos }] = queries;
  return {
    empresas: empresas ?? [],
    contactos: contactos ?? [],
    pipelines: pipelines ?? [],
    etapas: etapas ?? [],
    usuarios: usuarios ?? [],
    motivos: motivos ?? [],
    campos: (campos ?? []) as CampoPersonalizado[],
  };
}
