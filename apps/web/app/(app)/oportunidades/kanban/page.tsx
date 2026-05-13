import Link from "next/link";
import { getKanbanBoard, listPipelinesForPicker } from "@/lib/db/oportunidades";
import { KanbanBoard } from "./kanban-board";
import { PipelineSwitcher } from "./pipeline-switcher";

type SearchParams = Promise<{ pipeline?: string }>;

export default async function KanbanPage({ searchParams }: { searchParams: SearchParams }) {
  const { pipeline } = await searchParams;
  const pipelines = await listPipelinesForPicker();
  const selectedPipelineId =
    pipeline ?? pipelines.find((p) => p.es_default)?.id ?? pipelines[0]?.id;

  const board = selectedPipelineId ? await getKanbanBoard(selectedPipelineId) : [];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Kanban</h1>
          <p className="text-xs text-gray-500 mt-1">
            Arrastrá las tarjetas para cambiar de etapa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pipelines.length > 0 && selectedPipelineId && (
            <PipelineSwitcher pipelines={pipelines} current={selectedPipelineId} />
          )}
          <Link
            href="/oportunidades"
            className="px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-gray-100 border border-gray-200"
          >
            Vista tabla
          </Link>
          <Link
            href="/oportunidades/nueva"
            className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-brand-primary text-white hover:bg-blue-700 transition-colors"
          >
            + Nueva
          </Link>
        </div>
      </header>

      {pipelines.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
          No hay pipelines configurados.{" "}
          <Link href="/admin/pipelines" className="text-brand-primary hover:underline">
            Crear uno →
          </Link>
        </div>
      ) : (
        <KanbanBoard initialBoard={board} />
      )}
    </div>
  );
}
