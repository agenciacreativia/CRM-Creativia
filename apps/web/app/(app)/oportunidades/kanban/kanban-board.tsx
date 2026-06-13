"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import type { KanbanColumn, KanbanCard } from "@/lib/db/oportunidades";
import { moveOportunidadAction } from "./actions";
import { cn } from "@/lib/utils";

// Left-edge stripe colors. Driven by `dias_en_etapa` vs `dias_maximo_alerta`
// (see lib/db/oportunidades.ts): red = overdue, yellow = approaching the
// limit, green = still within the optimal window, gray = no limit set.
// Column header dot per stage (uses position in pipeline for color rotation).
const COL_DOTS = ["bg-brand-sky", "bg-brand-navy", "bg-brand-green", "bg-brand-orange", "bg-brand-navy-soft"];

// Mapeo de urgencia a clase de borde izquierdo de la card. Antes se mostraba
// un badge de texto ("URGENTE"/"ALERTA") arriba de la card; con el lote UX
// pasamos a un stripe izquierdo, más limpio y consistente con tabla.
const URGENT_BORDER: Record<KanbanCard["color"], string> = {
  red: "border-l-4 border-l-status-danger",
  yellow: "border-l-4 border-l-brand-orange",
  green: "border-l-4 border-l-brand-green/70",
  gray: "border-l border-l-gray-200",
};

function formatCurrency(value: number | null, moneda: string): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanBoard({
  initialBoard,
  // manageHref se mantiene como prop opcional por compat con la page parent,
  // pero ya no se usa adentro (el acceso a "gestionar embudo" pasó al header
  // único de /oportunidades/kanban).
  manageHref: _manageHref,
}: {
  initialBoard: KanbanColumn[];
  manageHref?: string | null;
}) {
  void _manageHref;
  const [board, setBoard] = useState(initialBoard);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // El término de búsqueda vive ahora en la URL (?q=) — escrito por el QuickSearch
  // del header de la página. Eliminamos el input local y leemos de useSearchParams
  // para reaccionar al cambio sin necesidad de prop drilling.
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    for (const col of board) {
      for (const stage of col.etapas) {
        const card = stage.oportunidades.find((c) => c.id === id);
        if (card) {
          setActiveCard(card);
          return;
        }
      }
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    if (!e.over) return;
    const cardId = String(e.active.id);
    const newStageId = String(e.over.id);

    // Find current stage
    let currentStageId: string | null = null;
    let card: KanbanCard | null = null;
    for (const col of board) {
      for (const stage of col.etapas) {
        const found = stage.oportunidades.find((c) => c.id === cardId);
        if (found) {
          currentStageId = stage.id;
          card = found;
          break;
        }
      }
      if (card) break;
    }
    if (!card || !currentStageId || currentStageId === newStageId) return;

    // Validar que la etapa destino exista realmente en el board cargado.
    // Sin esto, una etapa de otro pipeline (drag stage cruzado) llegaría al server
    // y fallaría con error de FK.
    const targetExists = board.some((col) => col.etapas.some((s) => s.id === newStageId));
    if (!targetExists) {
      setError("Esa etapa no pertenece al embudo actual");
      return;
    }

    // Snapshot del board ANTES del optimistic update para revertir con precisión
    // si el server rechaza (initialBoard era stale después de varios moves).
    const snapshot = board;

    // Optimistic update
    setBoard((prev) =>
      prev.map((col) => ({
        ...col,
        etapas: col.etapas.map((s) => {
          if (s.id === currentStageId) {
            return { ...s, oportunidades: s.oportunidades.filter((c) => c.id !== cardId) };
          }
          if (s.id === newStageId) {
            return { ...s, oportunidades: [...s.oportunidades, card!] };
          }
          return s;
        }),
      })),
    );

    // Server action
    startTransition(async () => {
      const res = await moveOportunidadAction({ oportunidad_id: cardId, etapa_id: newStageId });
      if (!res.ok) {
        setError(res.error);
        setBoard(snapshot);
      }
    });
  }

  if (board.length === 0 || board[0].etapas.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">
        Este pipeline no tiene etapas todavía. Configuralo en{" "}
        <Link href="/admin/pipelines" className="text-brand-primary hover:underline">Admin → Pipelines</Link>.
      </div>
    );
  }

  // Client-side filter: derive what to render from `board` (the drag&drop
  // source of truth) without mutating it, so filtering never disturbs moves.
  const q = query.trim().toLowerCase();
  const displayEtapas = q
    ? board[0].etapas.map((stage) => ({
        ...stage,
        oportunidades: stage.oportunidades.filter((c) =>
          [c.nombre, c.empresa_nombre, c.asignado_nombre]
            .filter(Boolean)
            .some((field) => (field as string).toLowerCase().includes(q)),
        ),
      }))
    : board[0].etapas;

  const visibleCount = displayEtapas.reduce((n, s) => n + s.oportunidades.length, 0);

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger mb-4">
          {error}
        </div>
      )}

      {/* El input de búsqueda vive en el header de la page (QuickSearch).
          Acá solo mostramos el contador de matches cuando hay query activa. */}
      {q && (
        <p className="mb-2 text-xs text-gray-500">{visibleCount} coinciden con &quot;{q}&quot;</p>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/*
          Desktop (md+): columns share the width via flex-1 — every stage
          is visible at once, no horizontal scroll.
          Mobile: keep horizontal scroll with fixed-width columns since
          the table would be unreadable otherwise.
        */}
        <div className="flex gap-3 pb-4 overflow-x-auto md:overflow-x-visible">
          {displayEtapas.map((stage, idx) => (
            <Column key={stage.id} stage={stage} colorIndex={idx} />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <Card card={activeCard} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function Column({
  colorIndex = 0,
  stage,
}: {
  stage: KanbanColumn["etapas"][number];
  colorIndex?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalValue = stage.oportunidades.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const moneda = stage.oportunidades[0]?.moneda ?? "USD";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 flex-shrink-0 flex-col rounded-lg p-1 md:w-auto md:flex-1 md:min-w-0 transition-colors",
        isOver && "ring-2 ring-brand-navy",
      )}
    >
      {/* Lote UX: quitamos el lápiz "editar etapa" por columna. El acceso a
          gestionar el embudo queda en el lápiz único del header principal. */}
      <header className="mb-3 flex items-center justify-between px-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0", COL_DOTS[colorIndex % COL_DOTS.length])} />
          <h3 className="truncate text-xs font-bold uppercase tracking-wider text-gray-700">{stage.nombre}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{stage.oportunidades.length}</span>
        </div>
      </header>
      {(totalValue > 0 || stage.dias_maximo_alerta != null) && (
        <p className="mb-2 px-1.5 text-xs text-gray-500">
          {totalValue > 0 && <span className="font-semibold text-gray-700">{formatCurrency(totalValue, moneda)}</span>}
          {stage.dias_maximo_alerta != null && (
            <span className="ml-1.5 text-gray-400">· alerta {stage.dias_maximo_alerta}d</span>
          )}
        </p>
      )}
      <div className="space-y-2">
        {stage.oportunidades.map((card) => (
          <DraggableCard key={card.id} card={card} />
        ))}
        {stage.oportunidades.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400">Sin oportunidades</div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-30")}
    >
      <Card card={card} />
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase() || "—";
}

function Card({ card, isDragging }: { card: KanbanCard; isDragging?: boolean }) {
  return (
    <Link
      href={`/oportunidades/${card.id}`}
      onClick={(e) => isDragging && e.preventDefault()}
      title={
        card.color === "red"
          ? "Urgente: la oportunidad excedió los días recomendados en esta etapa"
          : card.color === "yellow"
            ? "Alerta: se está acercando al límite de días en esta etapa"
            : undefined
      }
      className={cn(
        // Lote UX: indicamos la urgencia con un borde izquierdo de color en
        // lugar del badge de texto ("URGENTE"/"ALERTA"). El tooltip explica.
        "relative block overflow-hidden rounded-lg border border-gray-200 bg-white p-3 transition-all hover:-translate-y-[1px] hover:border-gray-300 hover:shadow-lift",
        URGENT_BORDER[card.color],
        isDragging && "ring-2 ring-brand-navy cursor-grabbing shadow-elevated",
      )}
    >
      <p className="truncate text-sm font-semibold text-gray-900">{card.nombre}</p>
      <p className="mt-0.5 truncate text-xs text-gray-500">{card.empresa_nombre}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold tracking-tight text-gray-900">{formatCurrency(card.valor, card.moneda)}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              card.color === "red" ? "bg-status-danger/15 text-status-danger" :
              card.color === "yellow" ? "bg-brand-orange/15 text-brand-orange" :
              "bg-gray-100 text-gray-600",
            )}
          >
            {card.dias_en_etapa}d
          </span>
          {card.asignado_nombre && (
            <span
              title={card.asignado_nombre}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-[11px] font-bold text-white"
            >
              {initials(card.asignado_nombre)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
