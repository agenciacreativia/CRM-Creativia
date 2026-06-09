import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import type { RolComercial, ComisionAsesor } from "@/lib/comisiones-types";

export type { RolComercial, ComisionAsesor };

function monthBounds(ym: string): { from: string; to: string } {
  const [y, m] = ym.split("-").map((s) => parseInt(s, 10));
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Commissions for a given month (YYYY-MM). Sums WON opportunities updated in
 * that month per advisor, applies their commission %, and compares to meta.
 */
export async function listComisiones(ym: string): Promise<ComisionAsesor[]> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Sesión inválida");
  const supabase = await createServerSupabase();
  const { from, to } = monthBounds(ym);

  const [{ data: usuarios }, { data: ganadas }] = await Promise.all([
    supabase.from("usuario").select("id, nombre, rol_comercial, comision_pct, meta_mensual").eq("activo", true).eq("tenant_id", user.tenantId),
    supabase
      .from("oportunidad")
      .select("asignado_id, valor, moneda")
      .eq("estado", "ganado")
      .eq("tenant_id", user.tenantId)
      .gte("actualizado_en", from)
      .lt("actualizado_en", to),
  ]);

  const ventasPorAsesor = new Map<string, { ventas: number; cuenta: number; moneda: string }>();
  for (const o of ganadas ?? []) {
    const id = o.asignado_id as string | null;
    if (!id) continue;
    const cur = ventasPorAsesor.get(id) ?? { ventas: 0, cuenta: 0, moneda: (o.moneda as string) ?? "USD" };
    cur.ventas += (o.valor as number) ?? 0;
    cur.cuenta += 1;
    ventasPorAsesor.set(id, cur);
  }

  return (usuarios ?? [])
    .map((u: { id: string; nombre: string; rol_comercial: RolComercial | null; comision_pct: number; meta_mensual: number | null }) => {
      const v = ventasPorAsesor.get(u.id) ?? { ventas: 0, cuenta: 0, moneda: "USD" };
      const comision = (v.ventas * (Number(u.comision_pct) || 0)) / 100;
      const cumplimiento_pct = u.meta_mensual && u.meta_mensual > 0 ? Math.round((v.ventas / u.meta_mensual) * 100) : null;
      return {
        id: u.id,
        nombre: u.nombre,
        rol_comercial: u.rol_comercial,
        comision_pct: Number(u.comision_pct) || 0,
        meta_mensual: u.meta_mensual,
        ventas: v.ventas,
        cuenta: v.cuenta,
        cumplimiento_pct,
        comision,
        moneda: v.moneda,
      };
    })
    .sort((a, b) => b.ventas - a.ventas);
}

export type ComisionConfigInput = {
  rol_comercial: RolComercial | null;
  comision_pct: number;
  meta_mensual: number | null;
};

export async function setComisionConfig(usuarioId: string, input: ComisionConfigInput): Promise<void> {
  const caller = await getSessionUser();
  if (caller?.rol !== "admin") throw new Error("Solo administradores");
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("usuario")
    .update({
      rol_comercial: input.rol_comercial,
      comision_pct: input.comision_pct,
      meta_mensual: input.meta_mensual,
    })
    .eq("id", usuarioId);
  if (error) throw new Error(error.message);
}
