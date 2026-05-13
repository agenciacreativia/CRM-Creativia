"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PipelineDetail } from "@/lib/db/pipelines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  updatePipelineAction,
  deletePipelineAction,
  createEtapaAction,
  updateEtapaAction,
  deleteEtapaAction,
  reorderEtapasAction,
} from "../actions";

export function PipelineEditor({ pipeline }: { pipeline: PipelineDetail }) {
  const [error, setError] = useState<string | null>(null);
  const [etapas, setEtapas] = useState(pipeline.etapas);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function onUpdatePipeline(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await updatePipelineAction(pipeline.id, fd);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar pipeline "${pipeline.nombre}"? Solo se puede si no tiene oportunidades.`)) return;
    const res = await deletePipelineAction(pipeline.id);
    if (!res.ok) setError(res.error);
    else router.push("/admin/pipelines");
  }

  async function onAddEtapa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    // Auto-orden: last
    fd.set("orden", String(etapas.length));
    const res = await createEtapaAction(pipeline.id, fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = etapas.findIndex((x) => x.id === e.active.id);
    const newIndex = etapas.findIndex((x) => x.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(etapas, oldIndex, newIndex);
    setEtapas(reordered);
    startTransition(async () => {
      const res = await reorderEtapasAction(pipeline.id, reordered.map((e) => e.id));
      if (!res.ok) {
        setError(res.error);
        setEtapas(pipeline.etapas);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">{error}</div>
      )}

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">Pipeline</h2>
        <form onSubmit={onUpdatePipeline} className="space-y-4 max-w-2xl">
          <Field label="Nombre" htmlFor="nombre" required>
            <Input id="nombre" name="nombre" defaultValue={pipeline.nombre} required />
          </Field>
          <Field label="Descripción" htmlFor="descripcion">
            <Textarea id="descripcion" name="descripcion" rows={2} defaultValue={pipeline.descripcion ?? ""} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit">Guardar</Button>
            <Button type="button" variant="danger" onClick={onDelete}>Eliminar pipeline</Button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <header className="mb-4">
          <h2 className="text-sm font-bold uppercase text-gray-500">Etapas</h2>
          <p className="text-xs text-gray-400 mt-1">Arrastrá las etapas para reordenarlas. El orden afecta al Kanban.</p>
        </header>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={etapas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {etapas.map((etapa) => (
                <SortableEtapa
                  key={etapa.id}
                  etapa={etapa}
                  pipelineId={pipeline.id}
                  onError={setError}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {etapas.length === 0 && (
          <p className="text-sm text-gray-500 italic">Sin etapas. Agregá una abajo.</p>
        )}

        <form onSubmit={onAddEtapa} className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <Field label="Nueva etapa" htmlFor="nombre">
            <Input id="nombre" name="nombre" placeholder="ej. Demo agendada" required />
          </Field>
          <Field label="Alerta (días)" htmlFor="dias_maximo_alerta" hint="opcional">
            <Input id="dias_maximo_alerta" name="dias_maximo_alerta" type="number" min="1" className="w-32" />
          </Field>
          <Button type="submit">+ Agregar</Button>
        </form>
      </section>
    </div>
  );
}

function SortableEtapa({
  etapa,
  pipelineId,
  onError,
}: {
  etapa: PipelineDetail["etapas"][number];
  pipelineId: string;
  onError: (msg: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: etapa.id });
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("orden", String(etapa.orden));
    const res = await updateEtapaAction(etapa.id, pipelineId, fd);
    if (!res.ok) onError(res.error);
    else {
      setEditing(false);
      router.refresh();
    }
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar etapa "${etapa.nombre}"?`)) return;
    const res = await deleteEtapaAction(etapa.id, pipelineId);
    if (!res.ok) onError(res.error);
    else router.refresh();
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 border border-gray-200 rounded-md"
    >
      {editing ? (
        <form onSubmit={onUpdate} className="p-3 flex items-center gap-2">
          <Input name="nombre" defaultValue={etapa.nombre} className="flex-1" required />
          <Input
            name="dias_maximo_alerta"
            type="number"
            min="1"
            defaultValue={etapa.dias_maximo_alerta ?? ""}
            placeholder="alerta días"
            className="w-32"
          />
          <Button type="submit" size="sm">Guardar</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        </form>
      ) : (
        <div className="p-3 flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600 px-1"
            aria-label="Reordenar"
          >
            ⋮⋮
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{etapa.nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {etapa.oportunidades_count} oportunidades
              {etapa.dias_maximo_alerta != null && ` · alerta a los ${etapa.dias_maximo_alerta} días`}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="text-status-danger hover:bg-red-50">
            Eliminar
          </Button>
        </div>
      )}
    </li>
  );
}
