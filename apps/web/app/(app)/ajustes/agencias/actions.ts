"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { crearAgencia, updateAgencia, type CrearAgenciaResult } from "@/lib/db/agencias";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/db/planes";
import { getTenantFromHeaders } from "@/lib/tenant";
import { env } from "@/lib/env";

export type AgenciaResult = { ok: boolean; error?: string; creada?: CrearAgenciaResult };

/**
 * "Ver como agencia": the platform admin impersonates an agency. Generates a
 * session for that agency's admin (magic-link → verifyOtp) and returns a
 * handoff URL on the agency subdomain. The platform admin's own session on its
 * subdomain stays intact, so leaving is just navigating back.
 */
export async function verComoAgenciaAction(tenantId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    if (!(await isPlatformAdmin())) return { ok: false, error: "Solo la plataforma puede usar esto" };
    const admin = createAdminSupabase();
    const { data: tenant } = await admin
      .from("tenant")
      .select("subdominio, admin_email, nombre_empresa, es_plataforma, estado")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant || tenant.es_plataforma) return { ok: false, error: "Agencia inválida" };

    const { data: u } = await admin
      .from("usuario")
      .select("email")
      .eq("tenant_id", tenantId)
      .eq("rol", "admin")
      .eq("activo", true)
      .limit(1)
      .maybeSingle();
    const email = (u?.email as string | undefined) ?? (tenant.admin_email as string);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) return { ok: false, error: linkErr?.message ?? "No se pudo generar el acceso" };

    const plain = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: sess, error: vErr } = await plain.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    if (vErr || !sess?.session) return { ok: false, error: vErr?.message ?? "No se pudo iniciar la sesión" };

    const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
    const plataforma = await getTenantFromHeaders();
    const volver = `${scheme}://${plataforma?.subdominio ?? "app"}.${env.BASE_DOMAIN}/ajustes/agencias`;
    const frag = new URLSearchParams({
      access_token: sess.session.access_token,
      refresh_token: sess.session.refresh_token,
      next: "/dashboard",
      imp: "1",
      agencia: tenant.nombre_empresa as string,
      volver,
    }).toString();
    const url = `${scheme}://${tenant.subdominio}.${env.BASE_DOMAIN}/auth/handoff#${frag}`;
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

const crearSchema = z.object({
  nombre_empresa: z.string().trim().min(2, "Nombre requerido").max(120),
  subdominio: z.string().trim().toLowerCase().min(2).max(32),
  admin_nombre: z.string().trim().min(2, "Nombre del admin requerido").max(120),
  admin_email: z.string().trim().email("Correo inválido"),
  nit: z.string().trim().max(40).nullable().optional().default(null),
  plan_id: z.string().uuid("Elegí un plan"),
  trial_meses: z.number().int().min(0).max(12).default(3),
});

export async function crearAgenciaAction(payload: z.input<typeof crearSchema>): Promise<AgenciaResult> {
  const parsed = crearSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    const creada = await crearAgencia(parsed.data);
    revalidatePath("/ajustes/agencias");
    return { ok: true, creada };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

const updateSchema = z.object({
  estado: z.enum(["activo", "suspendido", "cancelado"]).optional(),
  plan_id: z.string().uuid().optional(),
  trial_termina_en: z.string().nullable().optional(),
  nit: z.string().trim().max(40).nullable().optional(),
});

export async function updateAgenciaAction(
  id: string,
  patch: z.input<typeof updateSchema>,
): Promise<AgenciaResult> {
  const parsed = updateSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  try {
    await updateAgencia(id, parsed.data);
    revalidatePath("/ajustes/agencias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
