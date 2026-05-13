"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Nota } from "@/lib/db/notas";
import { createNotaAction, deleteNotaAction } from "./notas-actions";

type Props = {
  initial: Nota[];
  target: { tipo: "empresa" | "contacto" | "oportunidad"; entity_id: string };
  currentUserId: string;
  currentUserIsAdmin: boolean;
};

export function NotasSection({ initial, target, currentUserId, currentUserIsAdmin }: Props) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("tipo", target.tipo);
    fd.append("entity_id", target.entity_id);
    const res = await createNotaAction(fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    startTransition(async () => {
      const res = await deleteNotaAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-sm font-bold uppercase text-gray-500 mb-4">
        Notas <span className="text-gray-400">({initial.length})</span>
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger mb-3">{error}</div>
      )}

      <form onSubmit={onAdd} className="mb-4">
        <Textarea
          name="contenido"
          rows={3}
          placeholder="Agregá una nota..."
          required
          minLength={1}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm">+ Agregar nota</Button>
        </div>
      </form>

      {initial.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Sin notas aún.</p>
      ) : (
        <ul className="space-y-3">
          {initial.map((n) => {
            const canDelete = currentUserIsAdmin || n.creado_por === currentUserId;
            return (
              <li key={n.id} className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.contenido}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {n.creado_por_nombre ?? "—"} · {formatDateTime(n.creado_en)}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="text-gray-400 hover:text-status-danger"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
