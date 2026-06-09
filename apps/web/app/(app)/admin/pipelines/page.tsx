import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { NewPipelineForm } from "./new-pipeline-form";

export default async function PipelinesPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        title="Crear nuevo embudo"
        subtitle="Definí un nombre y las etapas iniciales. Después podrás editarlas en cualquier momento."
        backHref="/oportunidades/kanban"
        backLabel="Volver al embudo"
      />
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <NewPipelineForm />
      </section>
    </div>
  );
}
