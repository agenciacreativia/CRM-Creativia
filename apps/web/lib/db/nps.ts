import "server-only";
import crypto from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";

export type NpsResumen = {
  total: number;
  respondidas: number;
  promotores: number;
  pasivos: number;
  detractores: number;
  score: number | null; // NPS = %prom − %detr
};

export type NpsItem = {
  id: string;
  contacto_nombre: string | null;
  oportunidad_nombre: string | null;
  puntaje: number | null;
  comentario: string | null;
  estado: string;
  enviado_en: string;
  respondido_en: string | null;
};

export async function getResumenNps(): Promise<NpsResumen> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("nps_respuesta").select("puntaje, estado");
    const total = (data ?? []).length;
    const respondidas = (data ?? []).filter((r) => r.estado === "respondida").length;
    const promotores = (data ?? []).filter((r) => (r.puntaje as number) >= 9).length;
    const detractores = (data ?? []).filter((r) => (r.puntaje as number) <= 6 && r.puntaje != null).length;
    const pasivos = respondidas - promotores - detractores;
    const score = respondidas > 0 ? Math.round(((promotores - detractores) / respondidas) * 100) : null;
    return { total, respondidas, promotores, pasivos, detractores, score };
  } catch {
    return { total: 0, respondidas: 0, promotores: 0, pasivos: 0, detractores: 0, score: null };
  }
}

export async function listNps(): Promise<NpsItem[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("nps_respuesta")
      .select("id, puntaje, comentario, estado, enviado_en, respondido_en, contacto:contacto_id(nombre), oportunidad:oportunidad_id(nombre)")
      .order("respondido_en", { ascending: false, nullsFirst: false })
      .order("enviado_en", { ascending: false })
      .limit(200);
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
      const c = (Array.isArray(r.contacto) ? r.contacto[0] : r.contacto) as { nombre: string } | null;
      const o = (Array.isArray(r.oportunidad) ? r.oportunidad[0] : r.oportunidad) as { nombre: string } | null;
      return {
        id: r.id as string,
        contacto_nombre: c?.nombre ?? null,
        oportunidad_nombre: o?.nombre ?? null,
        puntaje: (r.puntaje as number | null) ?? null,
        comentario: (r.comentario as string | null) ?? null,
        estado: r.estado as string,
        enviado_en: r.enviado_en as string,
        respondido_en: (r.respondido_en as string | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function crearEnvioNps(oportunidadId: string, contactoId: string | null): Promise<{ token: string; url: string }> {
  const user = await getSessionUser();
  if (!user?.tenantId) throw new Error("Tenant ausente");
  const supabase = await createServerSupabase();
  const token = crypto.randomBytes(20).toString("hex");
  const { error } = await supabase
    .from("nps_respuesta")
    .insert({ tenant_id: user.tenantId, oportunidad_id: oportunidadId, contacto_id: contactoId, token, estado: "pendiente" });
  if (error) throw new Error(error.message);
  const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
  const url = `${scheme}://${env.BASE_DOMAIN}/nps/${token}`;
  return { token, url };
}

/** Public lookup for the response form (no session, admin bypass for the encrypted token). */
export async function getEnvioNpsByToken(token: string): Promise<{ id: string; estado: string; oportunidad_nombre: string | null; contacto_nombre: string | null } | null> {
  if (!token) return null;
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("nps_respuesta")
    .select("id, estado, contacto:contacto_id(nombre), oportunidad:oportunidad_id(nombre)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  const c = (Array.isArray(data.contacto) ? data.contacto[0] : data.contacto) as { nombre: string } | null;
  const o = (Array.isArray(data.oportunidad) ? data.oportunidad[0] : data.oportunidad) as { nombre: string } | null;
  return { id: data.id as string, estado: data.estado as string, contacto_nombre: c?.nombre ?? null, oportunidad_nombre: o?.nombre ?? null };
}

export async function responderNps(token: string, puntaje: number, comentario: string | null): Promise<{ ok: boolean; error?: string }> {
  if (puntaje < 0 || puntaje > 10) return { ok: false, error: "Puntaje fuera de rango" };
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("nps_respuesta")
    .update({ puntaje, comentario, estado: "respondida", respondido_en: new Date().toISOString() })
    .eq("token", token)
    .eq("estado", "pendiente");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
