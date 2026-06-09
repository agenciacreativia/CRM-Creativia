import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { findDuplicadosContactos, findDuplicadosEmpresas } from "@/lib/db/duplicados";
import { PageHeader } from "@/components/ui/page-header";
import { DupList } from "./dup-list";
import { mergeContactosAction, mergeEmpresasAction } from "./actions";

export default async function DuplicadosPage() {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const [contactos, empresas] = await Promise.all([findDuplicadosContactos(), findDuplicadosEmpresas()]);

  const gContactos = contactos.map((g) => ({
    clave: g.clave,
    items: g.items.map((c) => ({ id: c.id, nombre: c.nombre, sub: c.email, extra: `${c.oportunidades} oport. · ${c.empresa_nombre ?? "sin empresa"}` })),
  }));
  const gEmpresas = empresas.map((g) => ({
    clave: g.clave,
    items: g.items.map((e) => ({ id: e.id, nombre: e.nombre, sub: e.ciudad ?? "—", extra: `${e.contactos} contactos · ${e.oportunidades} oport.` })),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Duplicados"
        subtitle="Registros que parecen repetidos. Al fusionar, las relaciones del duplicado se reasignan al principal y luego se elimina."
        backHref="/admin/datos"
        backLabel="Datos"
      />

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase text-gray-500">Contactos (por correo)</h2>
        <DupList grupos={gContactos} tipo="contacto" onMerge={mergeContactosAction} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase text-gray-500">Empresas (por nombre)</h2>
        <DupList grupos={gEmpresas} tipo="empresa" onMerge={mergeEmpresasAction} />
      </section>
    </div>
  );
}
