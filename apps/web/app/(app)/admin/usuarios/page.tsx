import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listUsuarios } from "@/lib/db/usuarios";
import { listRoles } from "@/lib/db/roles";
import { listInvitaciones } from "@/lib/db/invitaciones";
import { tenantTieneHerramienta } from "@/lib/db/planes";
import { getTenantFromHeaders } from "@/lib/tenant";
import { env } from "@/lib/env";
import { SearchInput, FilterSelect } from "@/components/list-toolbar";
import { Badge } from "@/components/ui/badge";
import { NewUsuarioForm } from "./new-usuario-form";
import { RolesManager } from "@/app/(app)/ajustes/roles/roles-manager";
import { CuentasManager } from "@/app/(app)/ajustes/roles/cuentas-manager";
import { PageHeader } from "@/components/ui/page-header";

type SearchParams = Promise<{ q?: string; rol?: string; activo?: string }>;

export default async function UsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  // La sección de Roles solo si el plan incluye la herramienta.
  const puedeRoles = await tenantTieneHerramienta("roles_permisos");

  const [usuarios, roles, invitaciones, tenant] = await Promise.all([
    listUsuarios({ q: params.q, rol: params.rol, activo: params.activo }),
    puedeRoles ? listRoles() : Promise.resolve([]),
    puedeRoles ? listInvitaciones() : Promise.resolve([]),
    puedeRoles ? getTenantFromHeaders() : Promise.resolve(null),
  ]);

  const scheme = env.BASE_DOMAIN.includes("localhost") ? "http" : "https";
  const inviteBaseUrl = `${scheme}://${tenant?.subdominio ?? "app"}.${env.BASE_DOMAIN}/invitacion`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y roles"
        subtitle="Miembros del equipo, roles con permisos por módulo e invitaciones."
        backHref="/ajustes"
        backLabel="Ajustes"
        right={<p className="text-sm text-gray-500">{usuarios.length} usuarios</p>}
      />

      {/* === USUARIOS === */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput placeholder="Buscar por nombre o email..." />
        <FilterSelect
          name="rol"
          options={[
            { value: "todos", label: "Todos los roles" },
            { value: "admin", label: "Admin" },
            { value: "asesor", label: "Asesor" },
          ]}
        />
        <FilterSelect
          name="activo"
          options={[
            { value: "todos", label: "Todos los estados" },
            { value: "activos", label: "Activos" },
            { value: "inactivos", label: "Desactivados" },
          ]}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <Th>Nombre</Th>
              <Th>Email</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th className="text-right">Oportunidades</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  No hay usuarios con esos filtros.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <Td>
                  <span className="font-medium text-gray-900">{u.nombre}</span>
                  {u.id === me.id && <span className="ml-2 text-xs text-gray-400">(vos)</span>}
                </Td>
                <Td className="text-gray-600">{u.email}</Td>
                <Td>
                  <Badge variant={u.rol === "admin" ? "info" : "default"}>{u.rol}</Badge>
                </Td>
                <Td>
                  <Badge variant={u.activo ? "success" : "danger"}>{u.activo ? "activo" : "desactivado"}</Badge>
                </Td>
                <Td className="text-right">{u.oportunidades_activas}</Td>
                <Td className="text-right">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="text-sm text-brand-primary hover:underline"
                  >
                    Editar →
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Crear usuario</h2>
        <NewUsuarioForm />
      </section>

      {/* === ROLES Y CUENTAS (si el plan lo incluye) === */}
      {puedeRoles && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">Roles y permisos</h2>
            <RolesManager initial={roles} />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">Cuentas e invitaciones</h2>
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
        </>
      )}
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
