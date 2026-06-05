/**
 * Seed de QA: crea planes de ejemplo + 3 agencias listas para usar.
 *
 * Requiere:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - BASE_DOMAIN (opcional, default localhost:3000)
 *
 * Uso:
 *   cd apps/web && npx tsx ../../scripts/seed-qa-agencias.ts
 *
 * Reentrant: si una agencia/plan ya existe se omite (no duplica). Las
 * contraseñas temporales se imprimen sólo cuando se crea la cuenta de
 * Supabase Auth por primera vez. Si querés rotarlas, eliminá el usuario
 * desde el panel de Auth y volvé a correr el script.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_DOMAIN = process.env.BASE_DOMAIN ?? "localhost:3000";
const SCHEME = BASE_DOMAIN.includes("localhost") ? "http" : "https";

if (!SUPABASE_URL || !SERVICE) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUBDOMINIO_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;

type SeedPlan = {
  nombre: string;
  descripcion: string;
  precio: number;
  modulos: Record<string, { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }>;
  herramientas: Record<string, boolean>;
  limites: { max_usuarios: number | null; max_contactos: number | null; max_oportunidades: number | null };
};

const PLANES: SeedPlan[] = [
  {
    nombre: "Starter QA",
    descripcion: "Plan inicial para agencias chicas (QA)",
    precio: 29,
    modulos: {
      dashboard: { ver: true, crear: false, editar: false, eliminar: false },
      empresas: { ver: true, crear: true, editar: true, eliminar: false },
      contactos: { ver: true, crear: true, editar: true, eliminar: false },
      oportunidades: { ver: true, crear: true, editar: true, eliminar: false },
      productos: { ver: true, crear: true, editar: true, eliminar: false },
      agenda: { ver: true, crear: true, editar: true, eliminar: false },
    },
    herramientas: { roles_permisos: false, importar_datos: true, plantillas_correo: true, google_integracion: false },
    limites: { max_usuarios: 3, max_contactos: 500, max_oportunidades: 200 },
  },
  {
    nombre: "Pro QA",
    descripcion: "Plan profesional (QA)",
    precio: 79,
    modulos: {
      dashboard: { ver: true, crear: true, editar: true, eliminar: true },
      empresas: { ver: true, crear: true, editar: true, eliminar: true },
      contactos: { ver: true, crear: true, editar: true, eliminar: true },
      oportunidades: { ver: true, crear: true, editar: true, eliminar: true },
      productos: { ver: true, crear: true, editar: true, eliminar: true },
      agenda: { ver: true, crear: true, editar: true, eliminar: true },
    },
    herramientas: { roles_permisos: true, importar_datos: true, plantillas_correo: true, google_integracion: true },
    limites: { max_usuarios: 10, max_contactos: 5000, max_oportunidades: 2000 },
  },
  {
    nombre: "Enterprise QA",
    descripcion: "Plan sin límites (QA)",
    precio: 199,
    modulos: {
      dashboard: { ver: true, crear: true, editar: true, eliminar: true },
      empresas: { ver: true, crear: true, editar: true, eliminar: true },
      contactos: { ver: true, crear: true, editar: true, eliminar: true },
      oportunidades: { ver: true, crear: true, editar: true, eliminar: true },
      productos: { ver: true, crear: true, editar: true, eliminar: true },
      agenda: { ver: true, crear: true, editar: true, eliminar: true },
    },
    herramientas: { roles_permisos: true, importar_datos: true, plantillas_correo: true, google_integracion: true },
    limites: { max_usuarios: null, max_contactos: null, max_oportunidades: null },
  },
];

type SeedAgencia = {
  nombre_empresa: string;
  subdominio: string;
  admin_nombre: string;
  admin_email: string;
  nit: string;
  plan: string;
  trial_meses: number;
};

const AGENCIAS: SeedAgencia[] = [
  {
    nombre_empresa: "Aventura Andina QA",
    subdominio: "aventura-andina-qa",
    admin_nombre: "Carolina Soto",
    admin_email: "qa+aventura@turistea.test",
    nit: "QA-100",
    plan: "Starter QA",
    trial_meses: 3,
  },
  {
    nombre_empresa: "Pampa Tours QA",
    subdominio: "pampa-tours-qa",
    admin_nombre: "Martín Álvarez",
    admin_email: "qa+pampa@turistea.test",
    nit: "QA-200",
    plan: "Pro QA",
    trial_meses: 1,
  },
  {
    nombre_empresa: "Costa Verde QA",
    subdominio: "costa-verde-qa",
    admin_nombre: "Luciana Ferrari",
    admin_email: "qa+costa@turistea.test",
    nit: "QA-300",
    plan: "Enterprise QA",
    trial_meses: 0,
  },
];

async function ensurePlanes(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const [i, p] of PLANES.entries()) {
    const { data: existing } = await admin.from("plan").select("id").eq("nombre", p.nombre).maybeSingle();
    if (existing?.id) {
      ids[p.nombre] = existing.id as string;
      console.log(`  · plan «${p.nombre}» ya existía (${existing.id})`);
      continue;
    }
    const { data, error } = await admin
      .from("plan")
      .insert({
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        moneda: "USD",
        periodicidad: "mensual",
        modulos: p.modulos,
        herramientas: p.herramientas,
        limites: p.limites,
        activo: true,
        orden: i + 1,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`No se pudo crear el plan ${p.nombre}: ${error?.message}`);
    ids[p.nombre] = data.id as string;
    console.log(`  ✓ plan «${p.nombre}» creado (${data.id})`);
  }
  return ids;
}

async function getOrCreateAuthUser(email: string, nombre: string, tenantId: string): Promise<{ id: string; tempPassword: string | null }> {
  // Buscar primero en auth.users
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  if (existing) return { id: existing.id, tempPassword: null };

  const tempPassword = "Crv-" + crypto.randomBytes(5).toString("hex");
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nombre, tenant_id: tenantId, rol: "admin" },
  });
  if (error || !created.user) throw new Error(`No se pudo crear el admin (${email}): ${error?.message}`);
  return { id: created.user.id, tempPassword };
}

async function ensureAgencia(a: SeedAgencia, planId: string): Promise<{ tenantId: string; loginUrl: string; tempPassword: string | null }> {
  if (!SUBDOMINIO_RE.test(a.subdominio)) throw new Error(`Subdominio inválido: ${a.subdominio}`);

  const { data: existing } = await admin
    .from("tenant")
    .select("id")
    .eq("subdominio", a.subdominio)
    .maybeSingle();

  let tenantId: string;
  if (existing?.id) {
    tenantId = existing.id as string;
    console.log(`  · tenant «${a.subdominio}» ya existía (${tenantId})`);
  } else {
    const trial = new Date();
    trial.setMonth(trial.getMonth() + (a.trial_meses || 0));
    const { data, error } = await admin
      .from("tenant")
      .insert({
        nombre_empresa: a.nombre_empresa,
        subdominio: a.subdominio,
        admin_email: a.admin_email,
        nit: a.nit,
        plan_id: planId,
        estado: "activo",
        trial_termina_en: a.trial_meses > 0 ? trial.toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`No se pudo crear el tenant ${a.subdominio}: ${error?.message}`);
    tenantId = data.id as string;
    console.log(`  ✓ tenant «${a.subdominio}» creado (${tenantId})`);
  }

  // Buscar rol Administrador del tenant (el trigger lo siembra al insert).
  const { data: rolAdmin } = await admin
    .from("rol")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("nombre", "Administrador")
    .maybeSingle();

  const { id: authId, tempPassword } = await getOrCreateAuthUser(a.admin_email, a.admin_nombre, tenantId);

  // Asegurar usuario espejo en public.usuario.
  const { data: usrExist } = await admin.from("usuario").select("id").eq("id", authId).maybeSingle();
  if (!usrExist?.id) {
    const { error: uErr } = await admin.from("usuario").insert({
      id: authId,
      tenant_id: tenantId,
      nombre: a.admin_nombre,
      email: a.admin_email,
      rol: "admin",
      rol_id: rolAdmin?.id ?? null,
      activo: true,
    });
    if (uErr) throw new Error(`No se pudo crear el usuario admin para ${a.admin_email}: ${uErr.message}`);
    console.log(`    + usuario admin enlazado (${authId})`);
  } else {
    console.log(`    · usuario admin ya enlazado (${authId})`);
  }

  const loginUrl = `${SCHEME}://${a.subdominio}.${BASE_DOMAIN}/login`;
  return { tenantId, loginUrl, tempPassword };
}

async function main() {
  console.log("== Sembrando planes QA ==");
  const planIds = await ensurePlanes();

  console.log("\n== Sembrando agencias QA ==");
  const credenciales: { agencia: string; loginUrl: string; admin_email: string; password: string | null }[] = [];
  for (const a of AGENCIAS) {
    const planId = planIds[a.plan];
    if (!planId) {
      console.error(`No se encontró el plan ${a.plan}, salteando ${a.subdominio}`);
      continue;
    }
    const r = await ensureAgencia(a, planId);
    credenciales.push({
      agencia: a.nombre_empresa,
      loginUrl: r.loginUrl,
      admin_email: a.admin_email,
      password: r.tempPassword,
    });
  }

  console.log("\n========= CREDENCIALES QA =========");
  for (const c of credenciales) {
    console.log(`\n· ${c.agencia}`);
    console.log(`  URL:      ${c.loginUrl}`);
    console.log(`  Email:    ${c.admin_email}`);
    console.log(`  Password: ${c.password ?? "(ya existía, no rotada)"}`);
  }
  console.log("\nListo. Si alguna password salió como '(ya existía)' y necesitás la original,");
  console.log("eliminá el usuario desde Supabase Auth y volvé a correr este script.\n");
}

main().catch((e) => {
  console.error("\nFalló el seed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
