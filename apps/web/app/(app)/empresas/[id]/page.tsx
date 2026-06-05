import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpresa } from "@/lib/db/empresas";
import { listContactos } from "@/lib/db/contactos";
import { listNotas } from "@/lib/db/notas";
import { listSedes } from "@/lib/db/sedes";
import { listCampos } from "@/lib/db/campos";
import { listHistorialCambios } from "@/lib/db/historial";
import { listDocumentos } from "@/lib/db/documentos";
import { listOportunidadesDeEmpresa, listContactosDeEmpresa } from "@/lib/db/relaciones";
import { OportunidadesList } from "@/components/relaciones/oportunidades-list";
import { ContactosList } from "@/components/relaciones/contactos-list";
import { getSessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { NotasSection } from "@/components/notas/notas-section";
import { SedesSection } from "@/components/sedes/sedes-section";
import { DocumentosPanel } from "@/components/documentos/documentos-panel";
import { HistorialSection } from "@/components/oportunidad/historial-section";
import { EmpresaAside } from "./empresa-aside";

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

  const [contactos, notas, sedes, campos, cambios, documentos, opps, contactosRel] = await Promise.all([
    listContactos({ empresa_id: id }),
    listNotas({ tipo: "empresa", entity_id: id }),
    listSedes(id),
    listCampos("empresa"),
    listHistorialCambios("empresa", id),
    listDocumentos("empresa", id),
    listOportunidadesDeEmpresa(id),
    listContactosDeEmpresa(id),
  ]);

  const historialEntries = cambios.map((c) => ({
    id: c.id,
    texto: c.descripcion,
    autor: c.autor,
    fecha: c.fecha,
  }));

  return (
    <div className="space-y-4">
      <Link href="/empresas" className="text-sm text-brand-primary hover:underline">
        ← Empresas
      </Link>

      {/* Top container */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-900">{empresa.nombre}</h1>
            <Badge variant={ESTADO_BADGE[empresa.estado_empresa] ?? "default"}>{empresa.estado_empresa}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {empresa.asignado_nombre ? (
              <>Asignado a <span className="font-medium text-gray-700">{empresa.asignado_nombre}</span></>
            ) : (
              "Sin asignar"
            )}
          </p>
        </div>
        {canEdit && (
          <Link
            href={`/empresas/${empresa.id}/editar`}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Editar
          </Link>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Big section */}
        <div className="space-y-4 lg:col-span-2">
          <ContactosList items={contactosRel} />
          <OportunidadesList items={opps} />

          {user && (
            <NotasSection
              initial={notas}
              target={{ tipo: "empresa", entity_id: id }}
              currentUserId={user.id}
              currentUserIsAdmin={user.rol === "admin"}
            />
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">
              Contactos asociados ({contactos.length})
            </h2>
            {contactos.length === 0 ? (
              <p className="text-sm text-gray-500">Sin contactos.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {contactos.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <Link href={`/contactos/${c.id}`} className="font-medium text-brand-primary hover:underline">
                        {c.nombre}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {c.email}
                        {c.cargo ? ` · ${c.cargo}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">{c.oportunidades_count} oportunidades</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <SedesSection empresaId={id} initial={sedes} canWrite={canEdit} />

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">Documentos</h2>
            <DocumentosPanel entidad="empresa" entityId={id} initial={documentos} canEdit={canEdit} />
          </section>

          <HistorialSection entries={historialEntries} />
        </div>

        {/* Aside */}
        <div className="lg:col-span-1">
          <EmpresaAside
            empresa={{
              id: empresa.id,
              nombre: empresa.nombre,
              estado_empresa: empresa.estado_empresa,
              email: empresa.email,
              telefono: empresa.telefono,
              ciudad: empresa.ciudad,
              pais: empresa.pais,
              sitio_web: empresa.sitio_web,
              descripcion: empresa.descripcion,
              campos_custom: empresa.campos_custom,
            }}
            campos={campos}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}
