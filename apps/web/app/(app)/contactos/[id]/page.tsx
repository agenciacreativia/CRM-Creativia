import { notFound } from "next/navigation";
import Link from "next/link";
import { getContacto } from "@/lib/db/contactos";
import { listNotas } from "@/lib/db/notas";
import { listCampos } from "@/lib/db/campos";
import { getSessionUser } from "@/lib/auth";
import { NotasSection } from "@/components/notas/notas-section";
import { CamposCustomSection } from "@/components/campos/campos-custom-section";

type Params = Promise<{ id: string }>;

export default async function ContactoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [c, user] = await Promise.all([getContacto(id), getSessionUser()]);
  if (!c) notFound();
  const canEdit = user?.rol === "admin";
  const [notas, campos] = await Promise.all([
    listNotas({ tipo: "contacto", entity_id: id }),
    listCampos("contacto"),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/contactos" className="text-sm text-brand-primary hover:underline">← Contactos</Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{c.nombre}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {c.cargo && <p className="text-sm text-gray-500">{c.cargo}</p>}
            {c.asignado_nombre ? (
              <span className="text-xs text-gray-600">
                Asignado a <strong>{c.asignado_nombre}</strong>
              </span>
            ) : (
              <span className="text-xs text-gray-400">No asignado</span>
            )}
          </div>
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

        <div className="flex flex-wrap gap-2 mb-4">
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-brand-primary text-white hover:bg-blue-700 transition-colors"
            >
              ✉️ Email
            </a>
          )}
          {c.telefono && (
            <a
              href={`tel:${cleanPhone(c.telefono)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              📞 Llamar
            </a>
          )}
          {c.telefono_whatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(c.telefono_whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              💬 WhatsApp
            </a>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-gray-500">Email</dt>
            <dd className="text-gray-800">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="text-brand-primary hover:underline">{c.email}</a>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Teléfono</dt>
            <dd className="text-gray-800">
              {c.telefono ? (
                <a href={`tel:${cleanPhone(c.telefono)}`} className="text-brand-primary hover:underline">{c.telefono}</a>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">WhatsApp</dt>
            <dd className="text-gray-800">
              {c.telefono_whatsapp ? (
                <a
                  href={`https://wa.me/${cleanPhone(c.telefono_whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  {c.telefono_whatsapp}
                </a>
              ) : "—"}
            </dd>
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

      <CamposCustomSection
        tipo_entidad="contacto"
        entity_id={id}
        campos={campos}
        values={c.campos_custom}
        canEdit={canEdit}
      />

      {user && (
        <NotasSection
          initial={notas}
          target={{ tipo: "contacto", entity_id: id }}
          currentUserId={user.id}
          currentUserIsAdmin={user.rol === "admin"}
        />
      )}
    </div>
  );
}

/** Strip non-digit characters for tel:/wa.me: links (keeps leading +). */
function cleanPhone(s: string): string {
  const trimmed = s.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D+/g, "");
}
