import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getPipeline } from "@/lib/db/pipelines";
import { PipelineEditor } from "./pipeline-editor";

type Params = Promise<{ id: string }>;

export default async function PipelineDetailPage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const { id } = await params;
  const pipeline = await getPipeline(id);
  if (!pipeline) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/pipelines" className="text-sm text-brand-primary hover:underline">← Pipelines</Link>
      <PipelineEditor pipeline={pipeline} />
    </div>
  );
}
