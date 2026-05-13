import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpresa } from "@/lib/db/empresas";
import { listContactos } from "@/lib/db/contactos";
import { getSessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

type Params = Promise<{ id: string }>;

const ESTADO_BADGE: Record<string, "info" | "success" | "default"> = {
  prospecto: "info",
  cliente: "success",
  inactivo: "default",
};

export default async function EmpresaDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [empresa, user] = await Promise.all([getEmpresa(id), getSessionUser()]);
  if (!empresa) notFound();
  const canEdit = user?.rol === "admin";

  const contactos = await listContactos({ empresa_id: id });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/empresas" className="text-sm text-brand-primary hover:underline">← Empresas</Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{empresa.nombre}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={ESTADO_BADGE[empresa.estado_empresa] ?? "default"}>{empresa.estado_empresa}</Badge>
            {empresa.origen && <Badge>{empresa.origen}</Badge>}
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/empresas/${empresa.id}/editar`}
            className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Editar
          </Link>
        )}
      </header>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Datos básicos</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Email" value={empresa.email} />
          <Field label="Teléfono" value={empresa.telefono} />
          <Field label="Sitio web" value={empresa.sitio_web} link />
          <Field label="Dirección" value={empresa.direccion} />
          <Field label="Ciudad" value={empresa.ciudad} />
          <Field label="País" value={empresa.pais} />
        </dl>
        {empresa.descripcion && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dt className="text-xs uppercase text-gray-500">Descripción</dt>
            <dd className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{empresa.descripcion}</dd>
          </div>
        )}
      </section>

      {Object.keys(empresa.campos_custom).length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Campos personalizados</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {Object.entries(empresa.campos_custom).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-gray-500">{k}</dt>
                <dd className="text-gray-800">{String(v ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">
          Contactos asociados ({contactos.length})
        </h2>
        {contactos.length === 0 ? (
          <p className="text-sm text-gray-500">Sin contactos.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {contactos.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <Link href={`/contactos/${c.id}`} className="text-brand-primary hover:underline font-medium">
                    {c.nombre}
                  </Link>
                  <p className="text-xs text-gray-500">{c.email}{c.cargo ? ` · ${c.cargo}` : ""}</p>
                </div>
                <span className="text-xs text-gray-400">{c.oportunidades_count} oportunidades</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="text-gray-800 mt-0.5">
        {value ? (
          link ? (
            <a
              href={value.startsWith("http") ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </dd>
    </div>
  );
}
