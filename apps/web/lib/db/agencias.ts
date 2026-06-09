import "server-only";
import crypto from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/db/planes";
import { env } from "@/lib/env";

export type Agencia = {
  id: string;
  nombre_empresa: string;
  subdominio: string;
  estado: "activo" | "suspendido" | "cancelado";
  admin_email: string;
  nit: string | null;
  plan_id: string | null;
  plan_nombre: string | null;
  trial_termina_en: string | null;
  usuarios_count: number;
  creado_en: string;
};

async function ensurePlatform() {
  if (!(await isPlatformAdmin())) throw new Error("Solo la plataforma puede gestionar agencias");
}

function loginUrl(subdominio: string): string {
  const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
  return `${scheme}://${subdominio}.${env.BASE_DOMAIN}/login`;
}

/** List client agencies (excludes the platform tenant). */
export async function listAgencias(): Promise<Agencia[]> {
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("tenant")
    .select("id, nombre_empresa, subdominio, estado, admin_email, nit, plan_id, trial_termina_en, creado_en, es_plataforma, plan(nombre), usuario(count)")
    .order("creado_en", { ascending: false });
  if (error) return [];
  return (data ?? [])
    .filter((t: { es_plataforma?: boolean }) => !t.es_plataforma)
    .map((t: {
      id: string; nombre_empresa: string; subdominio: string; estado: Agencia["estado"];
      admin_email: string; nit: string | null; plan_id: string | null; trial_termina_en: string | null; creado_en: string;
      plan: { nombre: string } | { nombre: string }[] | null; usuario?: { count: number }[];
    }) => {
      const plan = Array.isArray(t.plan) ? t.plan[0] : t.plan;
      return {
        id: t.id,
        nombre_empresa: t.nombre_empresa,
        subdominio: t.subdominio,
        estado: t.estado,
        admin_email: t.admin_email,
        nit: t.nit ?? null,
        plan_id: t.plan_id,
        plan_nombre: plan?.nombre ?? null,
        trial_termina_en: t.trial_termina_en,
        usuarios_count: t.usuario?.[0]?.count ?? 0,
        creado_en: t.creado_en,
      };
    });
}

export type CrearAgenciaInput = {
  nombre_empresa: string;
  subdominio: string;
  admin_nombre: string;
  admin_email: string;
  nit: string | null;
  plan_id: string;
  trial_meses: number;
};

export type CrearAgenciaResult = {
  tenantId: string;
  subdominio: string;
  loginUrl: string;
  adminEmail: string;
  tempPassword: string;
};

const SUBDOMINIO_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;

export async function crearAgencia(input: CrearAgenciaInput): Promise<CrearAgenciaResult> {
  await ensurePlatform();
  const admin = createAdminSupabase();

  const sub = input.subdominio.trim().toLowerCase();
  if (!SUBDOMINIO_RE.test(sub)) {
    throw new Error("Subdominio inválido (solo minúsculas, números y guiones).");
  }
  const { data: dup } = await admin.from("tenant").select("id").eq("subdominio", sub).maybeSingle();
  if (dup) throw new Error("Ese subdominio ya está en uso.");

  // Trial end date
  const trial = new Date();
  trial.setMonth(trial.getMonth() + (input.trial_meses || 0));

  // 1) Create the tenant (trigger seeds Administrador + Asesor roles).
  const { data: tenant, error: tErr } = await admin
    .from("tenant")
    .insert({
      nombre_empresa: input.nombre_empresa.trim(),
      subdominio: sub,
      admin_email: input.admin_email.trim(),
      nit: input.nit?.trim() || null,
      plan_id: input.plan_id,
      estado: "activo",
      trial_termina_en: input.trial_meses > 0 ? trial.toISOString() : null,
    })
    .select("id")
    .single();
  if (tErr || !tenant) throw new Error(`No se pudo crear la agencia: ${tErr?.message ?? ""}`);
  const tenantId = tenant.id;

  try {
    // 2) Find the auto-seeded Administrador role for this tenant.
    const { data: rolAdmin } = await admin
      .from("rol")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("nombre", "Administrador")
      .maybeSingle();

    // 3) Create the first admin account with a temporary password.
    const tempPassword = "Crv-" + crypto.randomBytes(5).toString("hex");
    const { data: created, error: aErr } = await admin.auth.admin.createUser({
      email: input.admin_email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nombre: input.admin_nombre.trim(), tenant_id: tenantId, rol: "admin" },
    });
    if (aErr || !created.user) throw new Error(aErr?.message ?? "No se pudo crear el admin");

    // 4) Link the public.usuario row.
    const { error: uErr } = await admin.from("usuario").insert({
      id: created.user.id,
      tenant_id: tenantId,
      nombre: input.admin_nombre.trim(),
      email: input.admin_email.trim(),
      rol: "admin",
      rol_id: rolAdmin?.id ?? null,
      activo: true,
    });
    if (uErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(uErr.message);
    }

    return {
      tenantId,
      subdominio: sub,
      loginUrl: loginUrl(sub),
      adminEmail: input.admin_email.trim(),
      tempPassword,
    };
  } catch (e) {
    // Rollback best-effort del tenant si la provisión del admin falló. Si el
    // delete del rollback también falla, NO pisamos el error original (con eso
    // perderíamos el "por qué" se rompió). Logueamos y propagamos el causante.
    try {
      const { error: rbErr } = await admin.from("tenant").delete().eq("id", tenantId);
      if (rbErr) console.error(`[crearAgencia] rollback de tenant ${tenantId} falló:`, rbErr.message);
    } catch (rbExc) {
      console.error(`[crearAgencia] rollback de tenant ${tenantId} lanzó excepción:`, rbExc);
    }
    throw e;
  }
}

export async function updateAgencia(
  id: string,
  patch: { estado?: Agencia["estado"]; plan_id?: string; trial_termina_en?: string | null; nit?: string | null },
): Promise<void> {
  await ensurePlatform();
  const admin = createAdminSupabase();
  const body: Record<string, unknown> = {};
  if (patch.estado !== undefined) body.estado = patch.estado;
  if (patch.plan_id !== undefined) body.plan_id = patch.plan_id; // change auto-releases waitlist (DB trigger)
  if (patch.trial_termina_en !== undefined) body.trial_termina_en = patch.trial_termina_en;
  if (patch.nit !== undefined) body.nit = patch.nit?.trim() || null;
  if (Object.keys(body).length === 0) return;
  const { error } = await admin.from("tenant").update(body).eq("id", id);
  if (error) throw new Error(error.message);
}
