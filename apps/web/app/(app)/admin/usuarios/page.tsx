import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listUsuarios } from "@/lib/db/usuarios";
import { Badge } from "@/components/ui/badge";
import { NewUsuarioForm } from "./new-usuario-form";

export default async function UsuariosPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const usuarios = await listUsuarios();

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestioná los miembros del tenant. Admins ven todo; asesores ven solo sus oportunidades.
        </p>
      </header>

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
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ""}`}>{children}</td>;
}
