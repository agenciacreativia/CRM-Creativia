import "server-only";
import crypto from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { EVENTOS_WEBHOOK, type Webhook } from "@/lib/webhooks-types";
import { validarUrlWebhook, urlWebhookEsSegura } from "@/lib/security/ssrf";

export type { Webhook };
export { EVENTOS_WEBHOOK };

async function ensureAdmin() {
  const u = await getSessionUser();
  if (u?.rol !== "admin") throw new Error("Solo administradores");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

export async function listWebhooks(): Promise<Webhook[]> {
  try {
    const u = await getSessionUser();
    if (!u?.tenantId) return [];
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("webhook")
      .select("id, nombre, url, eventos, activo, ultimo_envio, ultimo_estado")
      .eq("tenant_id", u.tenantId)
      .order("creado_en", { ascending: false });
    return (data ?? []) as Webhook[];
  } catch {
    return [];
  }
}

export type WebhookInput = { nombre: string; url: string; eventos: string[]; secret?: string | null };

export async function createWebhook(input: WebhookInput): Promise<string> {
  const caller = await ensureAdmin();
  // Anti-SSRF: rechaza URLs hacia la red interna antes de persistir.
  validarUrlWebhook(input.url);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("webhook")
    .insert({ ...input, tenant_id: caller.tenantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
export async function updateWebhook(id: string, patch: Partial<WebhookInput> & { activo?: boolean }): Promise<void> {
  const caller = await ensureAdmin();
  if (patch.url !== undefined) validarUrlWebhook(patch.url);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("webhook").update(patch).eq("id", id).eq("tenant_id", caller.tenantId);
  if (error) throw new Error(error.message);
}
export async function deleteWebhook(id: string): Promise<void> {
  const caller = await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("webhook").delete().eq("id", id).eq("tenant_id", caller.tenantId);
  if (error) throw new Error(error.message);
}

/** Best-effort fire-and-forget dispatcher. Reads tenant webhooks and POSTs payload. */
export async function dispatchWebhook(tenantId: string, evento: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const admin = createAdminSupabase();
    const { data } = await admin
      .from("webhook")
      .select("id, url, eventos, secret")
      .eq("tenant_id", tenantId)
      .eq("activo", true);
    for (const w of data ?? []) {
      const eventos = (w.eventos as string[]) ?? [];
      if (!eventos.includes(evento)) continue;
      // Anti-SSRF en tiempo de disparo: re-resolvemos el DNS y verificamos que
      // ninguna IP sea interna. Mitiga DNS rebinding (un host que resolvía
      // público al guardar pero apunta a la metadata interna al disparar).
      if (!(await urlWebhookEsSegura(w.url as string))) {
        admin.from("webhook").update({ ultimo_envio: new Date().toISOString(), ultimo_estado: 0 }).eq("id", w.id).then(() => {}, () => {});
        continue;
      }
      const body = JSON.stringify({ evento, payload, fecha: new Date().toISOString() });
      const headers: Record<string, string> = { "Content-Type": "application/json", "X-CRM-Event": evento };
      if (w.secret) {
        const sig = crypto.createHmac("sha256", w.secret as string).update(body).digest("hex");
        headers["X-CRM-Signature"] = sig;
      }
      // Timeout de 5s via AbortSignal para evitar requests colgados en memoria.
      // redirect:"manual" evita que un 302 a una IP interna evada la validación.
      fetch(w.url as string, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(5000) })
        .then(async (r) => {
          // Consumimos y descartamos el body para evitar memory leaks con respuestas grandes
          try { await r.text(); } catch { /* ignorar */ }
          admin.from("webhook").update({ ultimo_envio: new Date().toISOString(), ultimo_estado: r.status }).eq("id", w.id).then(() => {}, () => {});
        })
        .catch(() => {
          admin.from("webhook").update({ ultimo_envio: new Date().toISOString(), ultimo_estado: 0 }).eq("id", w.id).then(() => {}, () => {});
        });
    }
  } catch {
    /* never throw */
  }
}
