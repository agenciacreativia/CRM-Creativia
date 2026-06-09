import Link from "next/link";
import { Pencil } from "lucide-react";
import { getKanbanBoard, listPipelinesForPicker } from "@/lib/db/oportunidades";
import { getSessionUser } from "@/lib/auth";
import { KanbanBoard } from "./kanban-board";
import { PipelineSwitcher } from "./pipeline-switcher";
import { ViewToggle } from "@/components/oportunidades/view-toggle";
import { QuickSearch } from "@/components/filters/quick-search";

type SearchParams = Promise<{ pipeline?: string; q?: string }>;

export default async function KanbanPage({ searchParams }: { searchParams: SearchParams }) {
  const { pipeline } = await searchParams;
  const [pipelines, user] = await Promise.all([listPipelinesForPicker(), getSessionUser()]);
  const selectedPipelineId =
    pipeline ?? pipelines.find((p) => p.es_default)?.id ?? pipelines[0]?.id;

  const manageHref =
    user?.rol === "admin" && selectedPipelineId ? `/admin/pipelines/${selectedPipelineId}` : null;

  const board = selectedPipelineId ? await getKanbanBoard(selectedPipelineId) : [];

  return (
    <div className="space-y-4">
      {/* Header en una sola fila: lápiz + embudo + vista a la izq, buscador a
          la derecha (ml-auto). El buscador escribe `?q=` en la URL y el
          KanbanBoard lee useSearchParams para filtrar — así puede vivir acá
          arriba sin necesidad de pasar estado entre componentes. */}
      <header className="flex flex-wrap items-center gap-2">
        {manageHref && (
          <Link
            href={manageHref}
            title="Gestionar embudo"
            aria-label="Gestionar embudo"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-navy"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        )}
        {pipelines.length > 0 && selectedPipelineId && (
          <PipelineSwitcher pipelines={pipelines} current={selectedPipelineId} />
        )}
        <ViewToggle active="kanban" />
        <div className="ml-auto">
          <QuickSearch placeholder="Buscar tarjeta…" />
        </div>
      </header>

      {pipelines.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
          No hay embudos configurados.{" "}
          <Link href="/admin/pipelines" className="text-brand-primary hover:underline">
            Crear uno →
          </Link>
        </div>
      ) : (
        <KanbanBoard
          // Forzar remount cuando cambia el pipeline:
          // useState(initialBoard) en KanbanBoard solo lee el valor inicial al
          // primer mount, por lo que cambiar de Ventas → Prospección sin un
          // `key` deja las columnas y tarjetas en memoria del pipeline anterior.
          key={selectedPipelineId}
          initialBoard={board}
          manageHref={manageHref}
        />
      )}
    </div>
  );
}
