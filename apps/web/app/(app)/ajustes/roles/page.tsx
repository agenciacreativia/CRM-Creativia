import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getTenantFromHeaders } from "@/lib/tenant";
import { listRoles } from "@/lib/db/roles";
import { listUsuarios } from "@/lib/db/usuarios";
import { listInvitaciones } from "@/lib/db/invitaciones";
import { tenantTieneHerramienta } from "@/lib/db/planes";
import { env } from "@/lib/env";
import { RolesManager } from "./roles-manager";
import { CuentasManager } from "./cuentas-manager";

export default async function RolesPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");
  if (!(await tenantTieneHerramienta("roles_permisos"))) redirect("/ajustes");

  const [roles, usuarios, invitaciones, tenant] = await Promise.all([
    listRoles(),
    listUsuarios(),
    listInvitaciones(),
    getTenantFromHeaders(),
  ]);

  const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
  const inviteBaseUrl = `${scheme}://${tenant?.subdominio ?? "app"}.${env.BASE_DOMAIN}/invitacion`;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">
          ← Ajustes
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Roles y cuentas</h1>
        <p className="text-sm text-gray-500">
          Definí roles con permisos por módulo e invitá usuarios a tu equipo.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">Roles</h2>
        <RolesManager initial={roles} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">Cuentas del equipo</h2>
        <CuentasManager
          usuarios={usuarios.map((u) => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol_id: u.rol_id,
            activo: u.activo,
          }))}
          roles={roles.map((r) => ({ id: r.id, nombre: r.nombre, es_admin: r.es_admin }))}
          invitaciones={invitaciones}
          currentUserId={me.id}
          inviteBaseUrl={inviteBaseUrl}
        />
      </section>
    </div>
  );
}
