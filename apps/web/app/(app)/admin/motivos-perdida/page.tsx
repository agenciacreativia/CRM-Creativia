import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listMotivosPerdida } from "@/lib/db/motivos";
import { SearchInput } from "@/components/list-toolbar";
import { MotivosTable } from "./motivos-table";

type SearchParams = Promise<{ q?: string }>;

export default async function MotivosPerdidaPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (user?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const motivos = await listMotivosPerdida({ q: params.q });

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Motivos de pérdida</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personalizá los motivos que aparecen al marcar una oportunidad como perdida.
        </p>
      </header>
      <SearchInput placeholder="Buscar motivo..." />
      <MotivosTable initial={motivos} />
    </div>
  );
}
