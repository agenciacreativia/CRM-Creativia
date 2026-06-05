import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type ReporteProgramado = {
  id: string;
  nombre: string;
  destinatarios: string[];
  frecuencia: "diario" | "semanal" | "mensual";
  activo: boolean;
  ultimo_envio: string | null;
  proximo_envio: string | null;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (u?.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

function calcularProximo(freq: ReporteProgramado["frecuencia"]): string {
  const d = new Date();
  if (freq === "diario") d.setDate(d.getDate() + 1);
  else if (freq === "semanal") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

export async function listReportesProgramados(): Promise<ReporteProgramado[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("reporte_programado")
      .select("id, nombre, destinatarios, frecuencia, activo, ultimo_envio, proximo_envio")
      .order("creado_en", { ascending: false });
    return (data ?? []) as ReporteProgramado[];
  } catch {
    return [];
  }
}

export type ReporteProgramadoInput = { nombre: string; destinatarios: string[]; frecuencia: ReporteProgramado["frecuencia"]; activo: boolean };

export async function createReporteProgramado(input: ReporteProgramadoInput): Promise<string> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("reporte_programado")
    .insert({ ...input, tenant_id: caller.tenantId, proximo_envio: calcularProximo(input.frecuencia) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
export async function deleteReporteProgramado(id: string): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("reporte_programado").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
