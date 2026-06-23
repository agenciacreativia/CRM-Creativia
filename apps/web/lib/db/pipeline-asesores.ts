import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type AsesorCarga = {
  usuario_id: string;
  nombre: string;
  email: string;
  peso: number; // 1-100
};

/** Carga actual de asesores asignados al pipeline + sus pesos. */
export async function listAsesoresDePipeline(pipelineId: string): Promise<AsesorCarga[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("pipeline_asesor")
    .select("usuario_id, peso, usuario:usuario_id(nombre, email)")
    .eq("pipeline_id", pipelineId)
    .eq("activo", true);
  if (error) return [];
  type Row = { usuario_id: string; peso: number; usuario: { nombre: string; email: string } | { nombre: string; email: string }[] | null };
  return ((data ?? []) as Row[]).map((r) => {
    const u = Array.isArray(r.usuario) ? r.usuario[0] : r.usuario;
    return { usuario_id: r.usuario_id, peso: r.peso, nombre: u?.nombre ?? "—", email: u?.email ?? "" };
  });
}

/**
 * Reemplaza la configuración de asesores del pipeline. La suma de pesos debe
 * ser exactamente 100; si la lista viene vacía, se desactivan todos (los
 * leads nuevos quedan sin asignar).
 */
export async function setAsesoresDePipeline(
  pipelineId: string,
  cargas: { usuario_id: string; peso: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const limpio = cargas.filter((c) => c.peso > 0);
  const total = limpio.reduce((s, c) => s + c.peso, 0);
  if (limpio.length > 0 && total !== 100) {
    return { ok: false, error: `La suma de pesos debe ser 100, recibido ${total}` };
  }
  const admin = createAdminSupabase();
  // Wipe + reset: estado del round-robin se reinicia (los pesos cambiaron,
  // no queremos sesgo de la config anterior).
  const { error: e1 } = await admin.from("pipeline_asesor").delete().eq("pipeline_id", pipelineId);
  if (e1) return { ok: false, error: e1.message };
  const { error: e2 } = await admin.from("pipeline_asesor_estado").delete().eq("pipeline_id", pipelineId);
  if (e2) return { ok: false, error: e2.message };
  if (limpio.length > 0) {
    const rows = limpio.map((c) => ({ pipeline_id: pipelineId, usuario_id: c.usuario_id, peso: c.peso, activo: true }));
    const { error: e3 } = await admin.from("pipeline_asesor").insert(rows);
    if (e3) return { ok: false, error: e3.message };
  }
  return { ok: true };
}

/**
 * Devuelve el siguiente asesor del round-robin para el pipeline. Usa la RPC
 * pipeline_siguiente_asesor — atómica + Smooth Weighted Round-Robin.
 * Retorna null si el pipeline no tiene asesores configurados.
 */
export async function siguienteAsesorRR(pipelineId: string): Promise<string | null> {
  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("pipeline_siguiente_asesor", { p_pipeline_id: pipelineId });
  if (error || !data) return null;
  return data as string;
}
