import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getEmpresa } from "@/lib/db/empresas";
import { EmpresaForm } from "./empresa-form";

type Params = Promise<{ id: string }>;

export default async function EditEmpresaPage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/empresas");

  const { id } = await params;
  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href={`/empresas/${id}`} className="text-sm text-brand-primary hover:underline">
        ← {empresa.nombre}
      </Link>

      <header>
        <h1 className="text-2xl font-bold">Editar empresa</h1>
        <p className="text-sm text-gray-500 mt-1">{empresa.nombre}</p>
      </header>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <EmpresaForm empresa={empresa} />
      </section>
    </div>
  );
}
