import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type PipelineListItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_default: boolean;
  etapas_count: number;
  oportunidades_count: number;
};

export type PipelineDetail = {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_default: boolean;
  etapas: {
    id: string;
    nombre: string;
    orden: number;
    dias_maximo_alerta: number | null;
    oportunidades_count: number;
  }[];
};

export async function listPipelines(): Promise<PipelineListItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pipeline")
    .select("id, nombre, descripcion, es_default, etapa_pipeline(count), oportunidad(count)")
    .order("es_default", { ascending: false })
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    es_default: p.es_default,
    etapas_count: p.etapa_pipeline?.[0]?.count ?? 0,
    oportunidades_count: p.oportunidad?.[0]?.count ?? 0,
  }));
}

export async function getPipeline(id: string): Promise<PipelineDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pipeline")
    .select("id, nombre, descripcion, es_default, etapa_pipeline(id, nombre, orden, dias_maximo_alerta, oportunidad(count))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type StageRaw = {
    id: string;
    nombre: string;
    orden: number;
    dias_maximo_alerta: number | null;
    oportunidad?: { count: number }[];
  };
  return {
    id: data.id,
    nombre: data.nombre,
    descripcion: data.descripcion,
    es_default: data.es_default,
    etapas: ((data.etapa_pipeline ?? []) as StageRaw[])
      .map((e) => ({
        id: e.id,
        nombre: e.nombre,
        orden: e.orden,
        dias_maximo_alerta: e.dias_maximo_alerta,
        oportunidades_count: e.oportunidad?.[0]?.count ?? 0,
      }))
      .sort((a, b) => a.orden - b.orden),
  };
}
