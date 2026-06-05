import Link from "next/link";
import { getKanbanBoard, listPipelinesForPicker } from "@/lib/db/oportunidades";
import { getSessionUser } from "@/lib/auth";
import { KanbanBoard } from "./kanban-board";
import { PipelineSwitcher } from "./pipeline-switcher";
import { ViewToggle } from "@/components/oportunidades/view-toggle";

type SearchParams = Promise<{ pipeline?: string }>;

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ViewToggle active="kanban" />
          {pipelines.length > 0 && selectedPipelineId && (
            <PipelineSwitcher pipelines={pipelines} current={selectedPipelineId} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {manageHref && (
            <Link
              href={manageHref}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Gestionar embudo
            </Link>
          )}
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
