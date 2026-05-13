import { notFound } from "next/navigation";
import Link from "next/link";
import { getContacto } from "@/lib/db/contactos";
import { getSessionUser } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export default async function ContactoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [c, user] = await Promise.all([getContacto(id), getSessionUser()]);
  if (!c) notFound();
  const canEdit = user?.rol === "admin";

  return (
    <div className="space-y-6">
      <Link href="/contactos" className="text-sm text-brand-primary hover:underline">← Contactos</Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{c.nombre}</h1>
          {c.cargo && <p className="text-sm text-gray-500 mt-1">{c.cargo}</p>}
        </div>
        {canEdit && (
          <Link
            href={`/contactos/${c.id}/editar`}
            className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
        )}
      </header>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Datos del contacto</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-gray-500">Email</dt>
            <dd className="text-gray-800">{c.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Teléfono</dt>
            <dd className="text-gray-800">{c.telefono ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">WhatsApp</dt>
            <dd className="text-gray-800">{c.telefono_whatsapp ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Origen</dt>
            <dd className="text-gray-800">{c.origen ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Empresa</dt>
            <dd>
              <Link href={`/empresas/${c.empresa_id}`} className="text-brand-primary hover:underline">
                {c.empresa_nombre}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Oportunidades</dt>
            <dd className="text-gray-800">{c.oportunidades_count}</dd>
          </div>
        </dl>
        {c.descripcion && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-xs uppercase text-gray-500">Descripción</dt>
            <dd className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{c.descripcion}</dd>
          </div>
        )}
      </section>

      {Object.keys(c.campos_custom).length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Campos personalizados</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {Object.entries(c.campos_custom).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-gray-500">{k}</dt>
                <dd className="text-gray-800">{String(v ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
