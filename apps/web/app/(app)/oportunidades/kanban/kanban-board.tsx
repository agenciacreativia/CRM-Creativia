"use client";

import { useState, useTransition } from "react";
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

const CARD_COLOR_STYLES: Record<KanbanCard["color"], string> = {
  green: "border-l-status-ok",
  yellow: "border-l-status-warn",
  red: "border-l-status-danger",
  gray: "border-l-gray-300",
};

function formatCurrency(value: number | null, moneda: string): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanBoard({ initialBoard }: { initialBoard: KanbanColumn[] }) {
  const [board, setBoard] = useState(initialBoard);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        // Revert
        setBoard(initialBoard);
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

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger mb-4">
          {error}
        </div>
      )}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/*
          Desktop (md+): columns share the width via flex-1 — every stage
          is visible at once, no horizontal scroll.
          Mobile: keep horizontal scroll with fixed-width columns since
          the table would be unreadable otherwise.
        */}
        <div className="flex gap-3 pb-4 overflow-x-auto md:overflow-x-visible">
          {board[0].etapas.map((stage) => (
            <Column key={stage.id} stage={stage} />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <Card card={activeCard} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function Column({ stage }: { stage: KanbanColumn["etapas"][number] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalValue = stage.oportunidades.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const moneda = stage.oportunidades[0]?.moneda ?? "USD";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-64 md:w-auto md:flex-1 md:min-w-0 bg-gray-50 rounded-lg p-3 transition-colors",
        isOver && "bg-blue-50 ring-2 ring-brand-primary",
      )}
    >
      <header className="mb-3 px-1">
        <div className="flex items-center justify-between gap-1">
          <h3 className="font-medium text-sm text-gray-700 truncate">{stage.nombre}</h3>
          <span className="text-xs text-gray-500 flex-shrink-0">{stage.oportunidades.length}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {formatCurrency(totalValue, moneda)}
          {stage.dias_maximo_alerta != null && (
            <span className="text-gray-400"> · {stage.dias_maximo_alerta}d</span>
          )}
        </p>
      </header>
      <div className="space-y-2">
        {stage.oportunidades.map((card) => (
          <DraggableCard key={card.id} card={card} />
        ))}
        {stage.oportunidades.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-6">Sin oportunidades</div>
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

function Card({ card, isDragging }: { card: KanbanCard; isDragging?: boolean }) {
  return (
    <Link
      href={`/oportunidades/${card.id}`}
      onClick={(e) => isDragging && e.preventDefault()}
      className={cn(
        "block bg-white border border-gray-200 rounded p-3 shadow-sm hover:shadow transition-shadow",
        "border-l-4",
        CARD_COLOR_STYLES[card.color],
        isDragging && "shadow-lg ring-2 ring-brand-primary cursor-grabbing",
      )}
    >
      <p className="text-sm font-medium text-gray-900 truncate">{card.nombre}</p>
      <p className="text-xs text-gray-500 truncate mt-0.5">{card.empresa_nombre}</p>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-gray-700 font-medium">{formatCurrency(card.valor, card.moneda)}</span>
        <span className="text-gray-400">{card.dias_en_etapa}d</span>
      </div>
      {card.asignado_nombre && (
        <p className="text-xs text-gray-400 mt-1 truncate">→ {card.asignado_nombre}</p>
      )}
    </Link>
  );
}
