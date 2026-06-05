import { notFound } from "next/navigation";
import Link from "next/link";
import { getContacto } from "@/lib/db/contactos";
import { listNotas } from "@/lib/db/notas";
import { listCampos } from "@/lib/db/campos";
import { listHistorialCambios } from "@/lib/db/historial";
import { listDocumentos } from "@/lib/db/documentos";
import { listOportunidadesDeContacto, listEmpresasDeContacto } from "@/lib/db/relaciones";
import { OportunidadesList } from "@/components/relaciones/oportunidades-list";
import { EmpresasList } from "@/components/relaciones/empresas-list";
import { getSessionUser } from "@/lib/auth";
import { nivelDeContacto, NIVEL_LABEL, type NivelViajero } from "@/lib/db/rfm";
import { Badge } from "@/components/ui/badge";
import { NotasSection } from "@/components/notas/notas-section";
import { DocumentosPanel } from "@/components/documentos/documentos-panel";
import { HistorialSection } from "@/components/oportunidad/historial-section";
import { ContactoAside } from "./contacto-aside";

type Params = Promise<{ id: string }>;

/** Strip non-digit characters for tel:/wa.me: links (keeps leading +). */
function cleanPhone(s: string): string {
  const trimmed = s.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D+/g, "");
}

export default async function ContactoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [c, user] = await Promise.all([getContacto(id), getSessionUser()]);
  if (!c) notFound();
  const canEdit = user?.rol === "admin";

  const [notas, campos, cambios, documentos, nivel, oportunidades, empresasAsociadas] = await Promise.all([
    listNotas({ tipo: "contacto", entity_id: id }),
    listCampos("contacto"),
    listHistorialCambios("contacto", id),
    listDocumentos("contacto", id),
    nivelDeContacto(id),
    listOportunidadesDeContacto(id),
    listEmpresasDeContacto(id),
  ]);

  const historialEntries = cambios.map((x) => ({ id: x.id, texto: x.descripcion, autor: x.autor, fecha: x.fecha }));
  const NIVEL_BADGE: Record<NivelViajero, "warn" | "default" | "info"> = { oro: "warn", plata: "info", bronce: "default" };

  return (
    <div className="space-y-4">
      <Link href="/contactos" className="text-sm text-brand-primary hover:underline">
        ← Contactos
      </Link>

      {/* Top container */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-900">{c.nombre}</h1>
            <span title={`Compras: ${nivel.monto} ${nivel.moneda}`}>
              <Badge variant={NIVEL_BADGE[nivel.nivel]}>Viajero {NIVEL_LABEL[nivel.nivel]}</Badge>
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {c.cargo ? <span className="text-gray-700">{c.cargo}</span> : "Contacto"} ·{" "}
            <Link href={`/empresas/${c.empresa_id}`} className="text-brand-primary hover:underline">
              {c.empresa_nombre}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700">
                ✉️ Email
              </a>
            )}
            {c.telefono && (
              <a href={`tel:${cleanPhone(c.telefono)}`} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                📞 Llamar
              </a>
            )}
            {c.telefono_whatsapp && (
              <a href={`https://wa.me/${cleanPhone(c.telefono_whatsapp)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-green-700">
                💬 WhatsApp
              </a>
            )}
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/contactos/${c.id}/editar`}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Editar
          </Link>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <EmpresasList items={empresasAsociadas} />
          <OportunidadesList items={oportunidades} />

          {user && (
            <NotasSection
              initial={notas}
              target={{ tipo: "contacto", entity_id: id }}
              currentUserId={user.id}
              currentUserIsAdmin={user.rol === "admin"}
            />
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold uppercase text-gray-500">Documentos</h2>
            <DocumentosPanel entidad="contacto" entityId={id} initial={documentos} canEdit={canEdit} />
          </section>

          <HistorialSection entries={historialEntries} />
        </div>

        <div className="lg:col-span-1">
          <ContactoAside
            contacto={{
              id: c.id,
              nombre: c.nombre,
              cargo: c.cargo,
              email: c.email,
              telefono: c.telefono,
              telefono_whatsapp: c.telefono_whatsapp,
              empresa_id: c.empresa_id,
              empresa_nombre: c.empresa_nombre,
              campos_custom: c.campos_custom,
            }}
            campos={campos}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}
