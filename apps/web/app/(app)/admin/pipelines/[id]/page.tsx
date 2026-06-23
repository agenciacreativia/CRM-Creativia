import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getPipeline } from "@/lib/db/pipelines";
import { listUsuarios } from "@/lib/db/usuarios";
import { listAsesoresDePipeline } from "@/lib/db/pipeline-asesores";
import { PipelineEditor } from "./pipeline-editor";
import { AsesoresRR } from "./asesores-rr";

type Params = Promise<{ id: string }>;

export default async function PipelineDetailPage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [pipeline, usuarios, cargas] = await Promise.all([
    getPipeline(id),
    listUsuarios(),
    listAsesoresDePipeline(id),
  ]);
  if (!pipeline) notFound();

  return (
    <div className="space-y-6">
      <Link href="/oportunidades/kanban" className="text-sm text-brand-primary hover:underline">← Volver a oportunidades</Link>
      <PipelineEditor pipeline={pipeline} />
      <AsesoresRR
        pipelineId={id}
        cargasIniciales={cargas}
        usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol }))}
      />
    </div>
  );
}
