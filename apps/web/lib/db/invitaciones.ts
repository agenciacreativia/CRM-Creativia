import "server-only";
import crypto from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getMyAccessToken } from "@/lib/db/google";
import { sendGmail } from "@/lib/google/gmail";

export type Invitacion = {
  id: string;
  email: string;
  nombre: string | null;
  rol_id: string | null;
  rol_nombre: string | null;
  estado: "pendiente" | "aceptada" | "cancelada";
  creado_en: string;
  expira_en: string;
  token: string;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u) throw new Error("No autenticado");
  if (u.rol !== "admin") throw new Error("Solo administradores pueden invitar cuentas");
  if (!u.tenantId) throw new Error("Tenant ausente");
  return u;
}

/** Build the public accept URL for a token, on the tenant's subdomain. */
function inviteUrl(subdominio: string, token: string): string {
  // Si ROOT_URL está definido (siempre con scheme), tomamos ese scheme.
  // Caso contrario, "http" si BASE_DOMAIN huele a localhost / IP local.
  let scheme = "https";
  try {
    if (env.ROOT_URL) {
      scheme = new URL(env.ROOT_URL).protocol.replace(":", "") || "https";
    } else if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\.local$/.test(env.BASE_DOMAIN)) {
      scheme = "http";
    }
  } catch {
    scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
  }
  return `${scheme}://${subdominio}.${env.BASE_DOMAIN}/invitacion?token=${token}`;
}

export async function listInvitaciones(): Promise<Invitacion[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("invitacion")
    .select("id, email, nombre, rol_id, estado, creado_en, expira_en, token, rol(nombre)")
    .order("creado_en", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: {
    id: string;
    email: string;
    nombre: string | null;
    rol_id: string | null;
    estado: "pendiente" | "aceptada" | "cancelada";
    creado_en: string;
    expira_en: string;
    token: string;
    rol: { nombre: string } | { nombre: string }[] | null;
  }) => {
    const rol = Array.isArray(r.rol) ? r.rol[0] : r.rol;
    return {
      id: r.id,
      email: r.email,
      nombre: r.nombre,
      rol_id: r.rol_id,
      rol_nombre: rol?.nombre ?? null,
      estado: r.estado,
      creado_en: r.creado_en,
      expira_en: r.expira_en,
      token: r.token,
    };
  });
}

export type CreateInvitacionResult = { id: string; link: string; emailed: boolean };

export async function createInvitacion(input: {
  email: string;
  nombre: string | null;
  rol_id: string;
}): Promise<CreateInvitacionResult> {
  const caller = await ensureAdmin();
  const admin = createAdminSupabase();

  // Guard: no duplicate active account or pending invite for this email.
  const { data: existing } = await admin
    .from("usuario")
    .select("id")
    .eq("tenant_id", caller.tenantId)
    .eq("email", input.email)
    .maybeSingle();
  if (existing) throw new Error("Ya existe una cuenta con ese correo");

  // Tampoco permitimos invitaciones activas duplicadas — chequeamos pendientes.
  const { data: invitePend } = await admin
    .from("invitacion")
    .select("id")
    .eq("tenant_id", caller.tenantId)
    .eq("email", input.email)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (invitePend) throw new Error("Ya hay una invitación pendiente para ese correo. Cancelala antes de generar otra.");

  const token = crypto.randomBytes(24).toString("hex");
  const { data, error } = await admin
    .from("invitacion")
    .insert({
      tenant_id: caller.tenantId,
      email: input.email,
      nombre: input.nombre,
      rol_id: input.rol_id,
      token,
      invitado_por: caller.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Resolve tenant subdomain + name for the link/email.
  const { data: tenant } = await admin
    .from("tenant")
    .select("subdominio, nombre_empresa")
    .eq("id", caller.tenantId)
    .maybeSingle();
  const link = inviteUrl(tenant?.subdominio ?? "app", token);

  // Best-effort: send the invite from the admin's connected Gmail.
  let emailed = false;
  try {
    const accessToken = await getMyAccessToken();
    if (accessToken) {
      await sendGmail(accessToken, {
        to: input.email,
        subject: `Te invitaron a ${tenant?.nombre_empresa ?? "el CRM"}`,
        html: invitationHtml({
          empresa: tenant?.nombre_empresa ?? "el CRM",
          invitadoPor: caller.nombre,
          link,
        }),
      });
      emailed = true;
    }
  } catch {
    /* fall back to showing the copyable link in the UI */
  }

  return { id: data.id, link, emailed };
}

export async function cancelInvitacion(id: string): Promise<void> {
  await ensureAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("invitacion").update({ estado: "cancelada" }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Public lookup by token (no session) — uses admin to bypass RLS. */
export async function getInvitacionByToken(token: string): Promise<{
  id: string;
  email: string;
  nombre: string | null;
  tenant_id: string;
  rol_id: string | null;
  empresa: string | null;
  valida: boolean;
  motivo?: string;
} | null> {
  if (!token) return null;
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("invitacion")
    .select("id, email, nombre, tenant_id, rol_id, estado, expira_en, tenant(nombre_empresa)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  const tenant = Array.isArray(data.tenant) ? data.tenant[0] : data.tenant;
  let valida = true;
  let motivo: string | undefined;
  if (data.estado !== "pendiente") {
    valida = false;
    motivo = data.estado === "aceptada" ? "Esta invitación ya fue utilizada." : "Esta invitación fue cancelada.";
  } else if (new Date(data.expira_en).getTime() < Date.now()) {
    valida = false;
    motivo = "Esta invitación expiró.";
  }
  return {
    id: data.id,
    email: data.email,
    nombre: data.nombre,
    tenant_id: data.tenant_id,
    rol_id: data.rol_id,
    empresa: tenant?.nombre_empresa ?? null,
    valida,
    motivo,
  };
}

/** Accept an invite: create the account and link it to the tenant. Public (admin client). */
export async function acceptInvitacion(input: {
  token: string;
  nombre: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminSupabase();
  const { data: inv } = await admin
    .from("invitacion")
    .select("id, email, tenant_id, rol_id, estado, expira_en")
    .eq("token", input.token)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Invitación no encontrada" };
  if (inv.estado !== "pendiente") return { ok: false, error: "Esta invitación ya no es válida" };
  if (new Date(inv.expira_en as string).getTime() < Date.now()) return { ok: false, error: "La invitación expiró" };

  // Resolve the legacy text rol from the assigned role.
  let legacy: "admin" | "asesor" = "asesor";
  if (inv.rol_id) {
    const { data: rol } = await admin.from("rol").select("es_admin").eq("id", inv.rol_id).maybeSingle();
    if (rol?.es_admin) legacy = "admin";
  }

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: inv.email as string,
    password: input.password,
    email_confirm: true,
    user_metadata: { nombre: input.nombre, tenant_id: inv.tenant_id, rol: legacy },
  });
  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? "No se pudo crear la cuenta" };
  }

  const { error: insErr } = await admin.from("usuario").insert({
    id: created.user.id,
    tenant_id: inv.tenant_id,
    nombre: input.nombre,
    email: inv.email,
    rol: legacy,
    rol_id: inv.rol_id,
    activo: true,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: insErr.message };
  }

  await admin
    .from("invitacion")
    .update({ estado: "aceptada", aceptada_en: new Date().toISOString() })
    .eq("id", inv.id);

  return { ok: true };
}

function invitationHtml(args: { empresa: string; invitadoPor: string; link: string }): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#1f2937">Te invitaron a ${args.empresa}</h2>
  <p style="color:#374151;font-size:15px;line-height:1.5">
    <b>${args.invitadoPor}</b> te invitó a unirte al CRM de <b>${args.empresa}</b>.
    Hacé clic en el botón para crear tu cuenta y empezar.
  </p>
  <p style="margin:28px 0">
    <a href="${args.link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">
      Crear mi cuenta
    </a>
  </p>
  <p style="color:#9ca3af;font-size:13px">Si el botón no funciona, copiá este enlace:<br>${args.link}</p>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">La invitación vence en 7 días.</p>
</div>`;
}
