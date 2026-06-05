"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveOportunidadEtapa } from "@/lib/actions/inline-edit";

type Etapa = { id: string; nombre: string };

function clip(first: boolean, last: boolean): string {
  if (first && last) return "none";
  if (first) return "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%)";
  if (last) return "polygon(0 0, 100% 0, 100% 100%, 0 100%, 13px 50%)";
  return "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%, 13px 50%)";
}

export function StageWizard({
  oportunidadId,
  etapas,
  currentEtapaId,
  canEdit,
}: {
  oportunidadId: string;
  etapas: Etapa[];
  currentEtapaId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<string | null>(null);

  const activeId = optimistic ?? currentEtapaId;
  const currentIndex = etapas.findIndex((e) => e.id === activeId);

  function go(etapaId: string) {
    if (!canEdit || etapaId === activeId) return;
    setOptimistic(etapaId);
    setError(null);
    startTransition(async () => {
      const res = await moveOportunidadEtapa(oportunidadId, etapaId);
      if (!res.ok) {
        setError(res.error ?? "Error");
        setOptimistic(null);
      } else {
        router.refresh();
      }
    });
  }

  if (etapas.length === 0) return null;

  return (
    <div>
      <div className="flex w-full gap-1">
        {etapas.map((e, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const bg = active
            ? "bg-brand-primary text-white"
            : done
              ? "bg-[var(--brand-green)] text-brand-primary"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200";
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => go(e.id)}
              disabled={!canEdit || pending}
              style={{ clipPath: clip(i === 0, i === etapas.length - 1) }}
              className={`relative min-w-0 flex-1 truncate px-4 py-2.5 text-xs font-semibold transition-colors first:rounded-l-md last:rounded-r-md ${bg} ${
                canEdit ? "cursor-pointer" : "cursor-default"
              } ${i > 0 ? "-ml-2 pl-5" : ""}`}
              title={e.nombre}
            >
              {e.nombre}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
    </div>
  );
}
