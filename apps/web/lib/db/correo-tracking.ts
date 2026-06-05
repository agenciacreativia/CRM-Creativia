import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";

export type CorreoEnviado = {
  id: string;
  oportunidad_id: string | null;
  contacto_id: string | null;
  asunto: string | null;
  destinatario: string;
  enviado_en: string;
  abierto_en: string | null;
  click_en: string | null;
  aperturas: number;
  clicks: number;
};

/** Log a sent email + return tracking IDs for pixel + click-wrapping. */
export async function registrarCorreoEnviado(args: {
  oportunidadId: string | null;
  contactoId: string | null;
  asunto: string;
  destinatario: string;
  campaniaId?: string | null;
}): Promise<{ id: string; pixelUrl: string; clickRedirectBase: string } | null> {
  try {
    const user = await getSessionUser();
    if (!user?.tenantId) return null;
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("correo_enviado")
      .insert({
        tenant_id: user.tenantId,
        oportunidad_id: args.oportunidadId,
        contacto_id: args.contactoId,
        asunto: args.asunto,
        destinatario: args.destinatario,
        enviado_por: user.id,
        campania_id: args.campaniaId ?? null,
      })
      .select("id")
      .single();
    if (error || !data) return null;
    const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
    const base = `${scheme}://${env.BASE_DOMAIN}`;
    return {
      id: data.id as string,
      pixelUrl: `${base}/api/track/open/${data.id}.gif`,
      clickRedirectBase: `${base}/api/track/click/${data.id}?u=`,
    };
  } catch {
    return null;
  }
}

/** Inject tracking pixel + wrap links in an HTML body. */
export function aplicarTracking(html: string, pixelUrl: string, clickBase: string): string {
  // Wrap <a href="X"> to go through /api/track/click/:id?u=encodeURIComponent(X)
  const wrapped = html.replace(/href=["']([^"']+)["']/gi, (m, url: string) => {
    if (url.startsWith("mailto:") || url.startsWith("#")) return m;
    return `href="${clickBase}${encodeURIComponent(url)}"`;
  });
  const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none" />`;
  if (/<\/body>/i.test(wrapped)) return wrapped.replace(/<\/body>/i, pixel + "</body>");
  return wrapped + pixel;
}

/** Server-side: bump open/click counters. Admin client (no auth). */
export async function registrarAperturaCorreo(id: string): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin.from("correo_enviado").select("aperturas, abierto_en").eq("id", id).maybeSingle();
    if (!data) return;
    await admin
      .from("correo_enviado")
      .update({ aperturas: ((data.aperturas as number) ?? 0) + 1, abierto_en: data.abierto_en ?? new Date().toISOString() })
      .eq("id", id);
  } catch {
    /* ignore */
  }
}
export async function registrarClickCorreo(id: string): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin.from("correo_enviado").select("clicks, click_en").eq("id", id).maybeSingle();
    if (!data) return;
    await admin
      .from("correo_enviado")
      .update({ clicks: ((data.clicks as number) ?? 0) + 1, click_en: data.click_en ?? new Date().toISOString() })
      .eq("id", id);
  } catch {
    /* ignore */
  }
}

export async function listCorreosEnviadosOportunidad(oportunidadId: string): Promise<CorreoEnviado[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("correo_enviado")
      .select("id, oportunidad_id, contacto_id, asunto, destinatario, enviado_en, abierto_en, click_en, aperturas, clicks")
      .eq("oportunidad_id", oportunidadId)
      .order("enviado_en", { ascending: false });
    return (data ?? []) as CorreoEnviado[];
  } catch {
    return [];
  }
}
