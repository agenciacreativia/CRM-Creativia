import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { NewPipelineForm } from "./new-pipeline-form";

export default async function PipelinesPage() {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/oportunidades/kanban" className="text-sm text-brand-navy hover:underline">← Volver al embudo</Link>
      <header>
        <h1 className="text-2xl font-bold">Crear nuevo embudo</h1>
        <p className="mt-1 text-sm text-gray-500">Definí un nombre y las etapas iniciales. Después podrás editarlas en cualquier momento.</p>
      </header>
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <NewPipelineForm />
      </section>
    </div>
  );
}
