import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type BackupLogRow = {
  id: string;
  accion: "export" | "import";
  formato: "json" | "csv";
  registros: Record<string, number>;
  tamano_bytes: number | null;
  realizado_por_nombre: string | null;
  realizado_en: string;
};

export async function listBackupLog(limit = 20): Promise<BackupLogRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("backup_log")
    .select("id, accion, formato, registros, tamano_bytes, realizado_en, usuario(nombre)")
    .order("realizado_en", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    accion: "export" | "import";
    formato: "json" | "csv";
    registros: Record<string, number> | null;
    tamano_bytes: number | null;
    realizado_en: string;
    usuario: { nombre: string } | { nombre: string }[] | null;
  }>).map((row) => {
    const u = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
    return {
      id: row.id,
      accion: row.accion,
      formato: row.formato,
      registros: row.registros ?? {},
      tamano_bytes: row.tamano_bytes,
      realizado_por_nombre: u?.nombre ?? null,
      realizado_en: row.realizado_en,
    };
  });
}
