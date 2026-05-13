/**
 * Provisions auth users for known tenants.
 *
 * Currently provisions:
 *   - Juan Posada as ADMIN of tenant Creativia (juancarlos@agenciacreativia.com)
 *
 * Run AFTER migrations:
 *   npm run seed -w @crm/web
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Idempotent: if a user with the email already exists, its password is reset
 * to the value below and its public.usuario row is upserted with the right
 * tenant/role.
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
  creativia: "33333333-3333-3333-3333-333333333333",
};

const USERS: SeedUser[] = [
  {
    email: "juancarlos@agenciacreativia.com",
    password: "Mugrete1983@",
    nombre: "Juan Posada",
    rol: "admin",
    tenantId: TENANTS.creativia,
  },
];

async function upsertUser(u: SeedUser) {
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
  console.log("\n✓ Provisioning complete:");
  for (const u of USERS) {
    console.log(`  ${u.email} → tenant ${u.tenantId === TENANTS.creativia ? "creativia" : "?"} as ${u.rol}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
