import Link from "next/link";
import { getInvitacionByToken } from "@/lib/db/invitaciones";
import { AcceptForm } from "./accept-form";

type SearchParams = Promise<{ token?: string }>;

export default async function InvitacionPage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const inv = token ? await getInvitacionByToken(token) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {!inv ? (
          <Estado titulo="Invitación no válida" texto="El enlace es incorrecto o ya no existe." />
        ) : !inv.valida ? (
          <Estado titulo="Invitación no disponible" texto={inv.motivo ?? "Esta invitación ya no es válida."} />
        ) : (
          <>
            <header className="mb-6 text-center">
              <h1 className="text-xl font-bold text-gray-900">
                Unite a {inv.empresa ?? "el equipo"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Creá tu cuenta para empezar a usar el CRM.</p>
            </header>
            <AcceptForm token={token!} email={inv.email} nombre={inv.nombre ?? ""} />
          </>
        )}
      </div>
    </div>
  );
}

function Estado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
      <p className="mt-2 text-sm text-gray-500">{texto}</p>
      <Link href="/login" className="mt-4 inline-block text-sm text-brand-primary hover:underline">
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
