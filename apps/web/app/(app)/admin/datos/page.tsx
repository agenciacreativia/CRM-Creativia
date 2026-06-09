import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminDatosPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de datos"
        subtitle="Importar, exportar y administrar los datos del CRM."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          href="/admin/datos/importar"
          title="Importar datos"
          description="Subí archivos Excel para migrar tu base actual: empresas, contactos y oportunidades."
          status="available"
        />
        <Card
          href="/admin/pipelines"
          title="Pipelines y etapas"
          description="Personalizá tus embudos de venta, ordená etapas y configurá alertas de tiempo."
          status="available"
        />
        <Card
          href="/admin/motivos-perdida"
          title="Motivos de pérdida"
          description="Gestioná los motivos que aparecen al marcar una oportunidad como perdida."
          status="available"
        />
        <Card
          href="/admin/campos"
          title="Campos personalizados"
          description="Definí campos adicionales para empresas, contactos y oportunidades."
          status="available"
        />
        <Card
          href="/admin/datos/exportar"
          title="Exportar datos"
          description="Backup completo en JSON o exportar una entidad a CSV. Historial incluido."
          status="available"
        />
      </div>
    </div>
  );
}

function Card({
  href,
  title,
  description,
  status,
}: {
  href: string;
  title: string;
  description: string;
  status: "available" | "coming";
}) {
  const inner = (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-brand-primary transition-colors h-full">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {status === "coming" && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">próximamente</span>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
    </div>
  );

  if (status === "coming") {
    return <div className="opacity-50 cursor-not-allowed">{inner}</div>;
  }
  return <Link href={href}>{inner}</Link>;
}
