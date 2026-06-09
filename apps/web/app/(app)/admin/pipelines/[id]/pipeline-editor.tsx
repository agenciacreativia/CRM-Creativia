"use client";

import { useState, useTransition, useEffect } from "react";
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

  // Re-sincronizar estado local cuando el server component re-renderiza con
  // un nuevo `pipeline.etapas` (p. ej. después de router.refresh()). Sin esto,
  // useState congelaba la lista vieja y al agregar etapas se chocaba el orden.
  const etapasKey = pipeline.etapas.map((e) => `${e.id}:${e.orden}`).join("|");
  useEffect(() => {
    setEtapas(pipeline.etapas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapasKey]);

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
    if (!confirm(`¿Eliminar embudo "${pipeline.nombre}"? Solo se puede si no tiene oportunidades.`)) return;
    const res = await deletePipelineAction(pipeline.id);
    if (!res.ok) setError(res.error);
    else router.push("/oportunidades/kanban");
  }

  async function onAddEtapa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    // Auto-orden: max(orden) + 1 para evitar duplicados si se borraron
    // etapas intermedias (p. ej. quedan órdenes 0,1,3 → next debe ser 4, no 3).
    const nextOrden = etapas.length === 0 ? 0 : Math.max(...etapas.map((x) => x.orden)) + 1;
    fd.set("orden", String(nextOrden));
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
    <div className="space-y-3 pb-20">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>
      )}

      {/* Embudo: compact (sticky save abajo) */}
      <form id="pipeline-form" onSubmit={onUpdatePipeline} className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Embudo</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Nombre" htmlFor="nombre" required>
            <Input id="nombre" name="nombre" defaultValue={pipeline.nombre} required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripción" htmlFor="descripcion">
              <Input id="descripcion" name="descripcion" defaultValue={pipeline.descripcion ?? ""} />
            </Field>
          </div>
        </div>
      </form>

      {/* Etapas: compact */}
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Etapas</h2>
            <p className="text-xs text-gray-400">Arrastrá para reordenar.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{etapas.length}</span>
        </header>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={etapas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {etapas.map((etapa) => (
                <SortableEtapa key={etapa.id} etapa={etapa} pipelineId={pipeline.id} onError={setError} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {etapas.length === 0 && <p className="py-2 text-sm italic text-gray-500">Sin etapas todavía.</p>}

        {/* Form agregar (inline más compacto) */}
        <form onSubmit={onAddEtapa} className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
          <div className="min-w-40 flex-1">
            <label className="mb-1 block text-xs text-gray-500">Nueva etapa</label>
            <Input name="nombre" placeholder="ej. Demo agendada" required />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-gray-500">Alerta (días)</label>
            <Input name="dias_maximo_alerta" type="number" min="1" />
          </div>
          <Button type="submit" size="sm" variant="success">+ Agregar etapa</Button>
        </form>
      </section>

      {/* Sticky footer con Guardar (sticky, no fixed, así respeta el sidebar) */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-2 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 shadow-lift">
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>Eliminar embudo</Button>
        <Button type="submit" form="pipeline-form" size="md">Guardar cambios</Button>
      </div>
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
