import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type FacturacionRow = {
  tenant_id: string;
  nombre: string;
  subdominio: string;
  plan_nombre: string | null;
  estado_tenant: string;
  trial_termina_en: string | null;
  estado_suscripcion: string; // trial | activa | morosa | cancelada | trial_vencido | sin_suscripcion
  periodo_fin: string | null;
};

/** Billing overview for all client agencies (platform). Defensive: [] pre-0030. */
export async function listFacturacion(): Promise<FacturacionRow[]> {
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("tenant")
      .select("id, nombre_empresa, subdominio, estado, trial_termina_en, es_plataforma, plan(nombre), suscripcion(estado, periodo_fin)")
      .order("creado_en", { ascending: false });
    if (error) return [];
    const now = Date.now();
    return (data ?? [])
      .filter((t: { es_plataforma?: boolean }) => !t.es_plataforma)
      .map((t: {
        id: string; nombre_empresa: string; subdominio: string; estado: string; trial_termina_en: string | null;
        plan: { nombre: string } | { nombre: string }[] | null;
        suscripcion: { estado: string; periodo_fin: string | null } | { estado: string; periodo_fin: string | null }[] | null;
      }) => {
        const plan = Array.isArray(t.plan) ? t.plan[0] : t.plan;
        const sus = Array.isArray(t.suscripcion) ? t.suscripcion[0] : t.suscripcion;
        let estado_suscripcion = sus?.estado ?? "trial";
        if (!sus) {
          estado_suscripcion =
            t.trial_termina_en && new Date(t.trial_termina_en).getTime() < now ? "trial_vencido" : "trial";
        }
        return {
          tenant_id: t.id,
          nombre: t.nombre_empresa,
          subdominio: t.subdominio,
          plan_nombre: plan?.nombre ?? null,
          estado_tenant: t.estado,
          trial_termina_en: t.trial_termina_en,
          estado_suscripcion,
          periodo_fin: sus?.periodo_fin ?? null,
        };
      });
  } catch {
    return [];
  }
}
