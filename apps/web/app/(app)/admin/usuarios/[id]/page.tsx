import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUsuario } from "@/lib/db/usuarios";
import { PageHeader } from "@/components/ui/page-header";
import { EditUsuarioForm } from "./edit-usuario-form";

type Params = Promise<{ id: string }>;

export default async function EditUsuarioPage({ params }: { params: Params }) {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const { id } = await params;
  const usuario = await getUsuario(id);
  if (!usuario) notFound();

  const isSelf = me.id === usuario.id;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Editar usuario"
        subtitle={`${usuario.nombre} · ${usuario.email}`}
        backHref="/admin/usuarios"
        backLabel="Usuarios"
      />

      {isSelf && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          Estás editando tu propio usuario. No podés desactivarte ni quitarte el rol admin para evitar bloquear tu cuenta.
        </div>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <EditUsuarioForm usuario={usuario} isSelf={isSelf} />
      </section>
    </div>
  );
}
