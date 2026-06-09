import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { getMyAccessToken } from "@/lib/db/google";
import { sendGmail } from "@/lib/google/gmail";
import { registrarCorreoEnviado, aplicarTracking } from "@/lib/db/correo-tracking";

export type CampaniaMetrics = {
  campania_id: string; enviados: number; aperturas: number; abiertos_unicos: number;
  clicks: number; click_unicos: number; tasa_apertura: number | null; tasa_click: number | null;
  bounces: number; tasa_bounce: number | null;
};

export async function getCampaniaMetrics(campaniaId: string): Promise<CampaniaMetrics | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("correo_enviado")
      .select("aperturas, clicks, abierto_en, click_en, destinatario")
      .eq("campania_id", campaniaId);
    const rows = (data ?? []) as { aperturas: number; clicks: number; abierto_en: string | null; click_en: string | null; destinatario: string }[];
    const enviados = rows.length;
    if (enviados === 0) return { campania_id: campaniaId, enviados: 0, aperturas: 0, abiertos_unicos: 0, clicks: 0, click_unicos: 0, tasa_apertura: null, tasa_click: null, bounces: 0, tasa_bounce: null };
    const aperturas = rows.reduce((s, r) => s + (r.aperturas ?? 0), 0);
    const abiertos = rows.filter((r) => r.abierto_en).length;
    const clicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const clicksU = rows.filter((r) => r.click_en).length;
    const bounces = 0;
    return {
      campania_id: campaniaId, enviados, aperturas, abiertos_unicos: abiertos, clicks, click_unicos: clicksU,
      tasa_apertura: Math.round((abiertos / enviados) * 1000) / 10,
      tasa_click: Math.round((clicksU / enviados) * 1000) / 10,
      bounces, tasa_bounce: null,
    };
  } catch { return null; }
}

export async function getAllCampaniaMetrics(): Promise<Record<string, CampaniaMetrics>> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("correo_enviado")
      .select("campania_id, aperturas, clicks, abierto_en, click_en");
    const map = new Map<string, { enviados: number; aperturas: number; abiertos: number; clicks: number; clicksU: number }>();
    for (const r of (data ?? []) as { campania_id: string | null; aperturas: number; clicks: number; abierto_en: string | null; click_en: string | null }[]) {
      if (!r.campania_id) continue;
      const cur = map.get(r.campania_id) ?? { enviados: 0, aperturas: 0, abiertos: 0, clicks: 0, clicksU: 0 };
      cur.enviados += 1;
      cur.aperturas += r.aperturas ?? 0;
      cur.clicks += r.clicks ?? 0;
      if (r.abierto_en) cur.abiertos += 1;
      if (r.click_en) cur.clicksU += 1;
      map.set(r.campania_id, cur);
    }
    const out: Record<string, CampaniaMetrics> = {};
    for (const [k, v] of map) {
      out[k] = {
        campania_id: k,
        enviados: v.enviados, aperturas: v.aperturas, abiertos_unicos: v.abiertos,
        clicks: v.clicks, click_unicos: v.clicksU,
        tasa_apertura: v.enviados ? Math.round((v.abiertos / v.enviados) * 1000) / 10 : null,
        tasa_click: v.enviados ? Math.round((v.clicksU / v.enviados) * 1000) / 10 : null,
        bounces: 0, tasa_bounce: null,
      };
    }
    return out;
  } catch { return {}; }
}

export type Campania = {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo_html: string;
  segmento: { estado_empresa?: string; con_email?: boolean };
  estado: "borrador" | "enviada" | "cancelada";
  enviados: number;
  creada_en: string;
  enviada_en: string | null;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (u?.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

export async function listCampanias(): Promise<Campania[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("campania")
      .select("id, nombre, asunto, cuerpo_html, segmento, estado, enviados, creada_en, enviada_en")
      .order("creada_en", { ascending: false });
    return (data ?? []) as Campania[];
  } catch {
    return [];
  }
}

export type CampaniaInput = { nombre: string; asunto: string; cuerpo_html: string; segmento: Campania["segmento"] };

/**
 * Sanitización mínima del HTML del cuerpo: elimina <script>, <iframe>, atributos
 * on*= (onclick, onerror, etc.) y javascript: en hrefs. Es defensa en profundidad
 * — el envío por Gmail también filtra mucho del lado del cliente, pero queremos
 * que el HTML guardado en DB ya esté limpio para evitar XSS si se renderiza en
 * preview dentro del CRM.
 */
function sanitizeHtml(html: string): string {
  if (!html) return "";
  let s = html;
  // Bloques peligrosos
  s = s.replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*\/?>/gi, "");
  // Event handlers inline (on*= en cualquier tag)
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript: en href/src
  s = s.replace(/(href|src)\s*=\s*("(?:\s*javascript:[^"]*)"|'(?:\s*javascript:[^']*)'|\s*javascript:[^\s>]+)/gi, '$1="#"');
  return s;
}

export async function createCampania(input: CampaniaInput): Promise<string> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const sanitized = { ...input, cuerpo_html: sanitizeHtml(input.cuerpo_html) };
  const { data, error } = await supabase
    .from("campania")
    .insert({ ...sanitized, tenant_id: caller.tenantId, creada_por: caller.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("No se pudo crear la campaña");
  return data.id;
}

export async function deleteCampania(id: string): Promise<void> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("campania").delete().eq("id", id).eq("tenant_id", caller.tenantId!);
  if (error) throw new Error(error.message);
}

/** Resolve which contacts match a segment. */
type RawContactoRow = {
  id: string;
  email: string | null;
  empresa_id: string | null;
  empresa: { estado_empresa: string } | { estado_empresa: string }[] | null;
};

async function resolverDestinatarios(tenantId: string, segmento: Campania["segmento"]): Promise<{ id: string; email: string }[]> {
  const admin = createAdminSupabase();
  let query = admin.from("contacto").select("id, email, empresa_id, empresa:empresa_id(estado_empresa)").eq("tenant_id", tenantId);
  if (segmento.con_email !== false) query = query.not("email", "is", null).neq("email", "");
  const { data, error } = await query;
  if (error) {
    console.error("[campanias] resolverDestinatarios:", error.message);
    return [];
  }
  let rows = ((data ?? []) as RawContactoRow[]).map((r) => {
    const e = Array.isArray(r.empresa) ? r.empresa[0] : r.empresa;
    return {
      id: r.id,
      email: r.email,    // mantenemos null hasta el filtro final
      estado: e?.estado_empresa ?? null,
    };
  });
  if (segmento.estado_empresa) rows = rows.filter((r) => r.estado === segmento.estado_empresa);
  return rows
    .filter((r): r is typeof r & { email: string } => !!r.email && r.email.length > 0)
    .map((r) => ({ id: r.id, email: r.email }));
}

export async function enviarCampania(campaniaId: string): Promise<{ enviados: number; errores: number }> {
  const caller = await ensureAdmin();
  const accessToken = await getMyAccessToken();
  if (!accessToken) throw new Error("Conectá Google primero para enviar la campaña.");

  const admin = createAdminSupabase();
  // Lock atómico: ponemos enviada_en al momento de arrancar. Como antes era NULL,
  // sólo una de varias llamadas concurrentes va a poder hacer este update y conseguir
  // los datos de la campaña; las otras ven `null` en `data` y abortan sin reenviar.
  const lockTime = new Date().toISOString();
  const { data: locked, error: lockErr } = await admin
    .from("campania")
    .update({ enviada_en: lockTime })
    .eq("id", campaniaId)
    .eq("estado", "borrador")
    .is("enviada_en", null)
    .select("nombre, asunto, cuerpo_html, segmento")
    .maybeSingle();
  if (lockErr) throw new Error(lockErr.message);
  if (!locked) throw new Error("La campaña ya fue enviada, está enviándose o fue cancelada");
  const c = locked;

  const destinatarios = await resolverDestinatarios(caller.tenantId!, c.segmento as Campania["segmento"]);
  if (destinatarios.length === 0) {
    // Liberamos el lock para que el admin la pueda corregir y reintentar.
    await admin.from("campania").update({ enviada_en: null }).eq("id", campaniaId);
    throw new Error("Sin destinatarios para ese segmento");
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let enviados = 0, errores = 0;
  for (const d of destinatarios) {
    if (!emailRe.test(d.email)) {
      // Email malformado — saltamos. Contamos como error para que el admin lo vea.
      errores++;
      continue;
    }
    try {
      const track = await registrarCorreoEnviado({
        oportunidadId: null, contactoId: d.id, asunto: c.asunto as string, destinatario: d.email, campaniaId,
      });
      const html = track ? aplicarTracking(c.cuerpo_html as string, track.pixelUrl, track.clickRedirectBase) : (c.cuerpo_html as string);
      await sendGmail(accessToken, { to: d.email, subject: c.asunto as string, html });
      enviados++;
    } catch {
      errores++;
    }
  }

  const { error: finErr } = await admin
    .from("campania")
    .update({ estado: "enviada", enviados, enviada_en: new Date().toISOString() })
    .eq("id", campaniaId);
  if (finErr) {
    // Si no podemos persistir el estado final, lo registramos pero NO tiramos error
    // porque los correos ya fueron enviados. El admin lo verá en el listado.
    console.error("[campania] no se pudo actualizar estado final:", finErr.message);
  }

  return { enviados, errores };
}
