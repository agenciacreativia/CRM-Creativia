/**
 * Creates demo auth users for local development.
 *
 * Run AFTER migrations:
 *   npx tsx supabase/seed.ts
 *
 * Requires .env.local with SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type SeedUser = {
  email: string;
  password: string;
  nombre: string;
  rol: "admin" | "asesor";
  tenantId: string;
};

const TENANTS = {
  acme: "11111111-1111-1111-1111-111111111111",
  globex: "22222222-2222-2222-2222-222222222222",
};

const USERS: SeedUser[] = [
  { email: "admin@acme.test",   password: "Acme1234!",   nombre: "Admin Acme",    rol: "admin",  tenantId: TENANTS.acme },
  { email: "asesor@acme.test",  password: "Acme1234!",   nombre: "Asesor Acme",   rol: "asesor", tenantId: TENANTS.acme },
  { email: "admin@globex.test", password: "Globex1234!", nombre: "Admin Globex",  rol: "admin",  tenantId: TENANTS.globex },
  { email: "asesor@globex.test",password: "Globex1234!", nombre: "Asesor Globex", rol: "asesor", tenantId: TENANTS.globex },
];

async function upsertUser(u: SeedUser) {
  // 1. Create auth user (idempotent: if exists, fetch and reuse)
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((x) => x.email === u.email);

  let userId: string;
  if (found) {
    userId = found.id;
    await admin.auth.admin.updateUserById(userId, { password: u.password });
    console.log(`↻ Updated ${u.email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, tenant_id: u.tenantId, rol: u.rol },
    });
    if (error || !data.user) throw error ?? new Error("createUser returned no user");
    userId = data.user.id;
    console.log(`✓ Created ${u.email}`);
  }

  // 2. Upsert public.usuario row
  const { error: upErr } = await admin.from("usuario").upsert({
    id: userId,
    tenant_id: u.tenantId,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: true,
  });
  if (upErr) throw upErr;
}

async function main() {
  for (const u of USERS) {
    await upsertUser(u);
  }
  console.log("\n✓ Seed complete. Demo credentials:");
  for (const u of USERS) {
    console.log(`  ${u.email} / ${u.password}  (tenant: ${u.tenantId === TENANTS.acme ? "acme" : "globex"}, rol: ${u.rol})`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
