import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listMotivosPerdida } from "@/lib/db/motivos";
import { SearchInput } from "@/components/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { MotivosTable } from "./motivos-table";

type SearchParams = Promise<{ q?: string }>;

export default async function MotivosPerdidaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const motivos = await listMotivosPerdida({ q: params.q });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Motivos de pérdida"
        subtitle="Personalizá los motivos que aparecen al marcar una oportunidad como perdida."
      />
      <SearchInput placeholder="Buscar motivo..." />
      <MotivosTable initial={motivos} />
    </div>
  );
}
