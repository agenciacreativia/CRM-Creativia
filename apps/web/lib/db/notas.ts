import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type Nota = {
  id: string;
  tipo: "empresa" | "contacto" | "oportunidad";
  empresa_id: string | null;
  contacto_id: string | null;
  oportunidad_id: string | null;
  contenido: string;
  creado_por: string | null;
  creado_por_nombre: string | null;
  creado_en: string;
};

export async function listNotas(args: {
  tipo: "empresa" | "contacto" | "oportunidad";
  entity_id: string;
}): Promise<Nota[]> {
  const supabase = await createServerSupabase();
  const column = `${args.tipo}_id`;
  const { data, error } = await supabase
    .from("nota")
    .select("*, usuario(nombre)")
    .eq("tipo", args.tipo)
    .eq(column, args.entity_id)
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; tipo: "empresa" | "contacto" | "oportunidad"; empresa_id: string | null; contacto_id: string | null; oportunidad_id: string | null; contenido: string; creado_por: string | null; creado_en: string; usuario: { nombre: string } | { nombre: string }[] | null }) => {
    const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
    return {
      id: row.id,
      tipo: row.tipo,
      empresa_id: row.empresa_id,
      contacto_id: row.contacto_id,
      oportunidad_id: row.oportunidad_id,
      contenido: row.contenido,
      creado_por: row.creado_por,
      creado_por_nombre: u?.nombre ?? null,
      creado_en: row.creado_en,
    };
  });
}
