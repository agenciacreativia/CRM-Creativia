"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { GoogleTask } from "@/lib/google/tasks";
import { createTaskAction, completeTaskAction } from "./tasks-actions";

function fmtDue(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function GoogleTasks({ initial }: { initial: GoogleTask[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  // Set local de IDs ocultos optimistamente para evitar el lag visual
  // entre completeTaskAction y la re-hidratacion de props via router.refresh.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const visible = initial.filter((t) => !hiddenIds.has(t.id));

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = e.currentTarget;
    const res = await createTaskAction(new FormData(form));
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Error");
      return;
    }
    form.reset();
    setAdding(false);
    router.refresh();
  }

  function complete(id: string) {
    // Ocultamos la tarea de inmediato; si falla, la restauramos.
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    startTransition(async () => {
      const res = await completeTaskAction(id);
      if (!res.ok) {
        setError(res.error ?? "Error");
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase text-gray-500">Mis tareas (Google Tasks)</h2>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> {adding ? "Cancelar" : "Nueva tarea"}
        </Button>
      </div>

      {error && <p className="mb-2 text-sm text-status-danger">{error}</p>}

      {adding && (
        <form onSubmit={onAdd} className="mb-4 grid grid-cols-1 gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[1fr_160px_auto]">
          <Input name="title" placeholder="¿Qué hay que hacer?" required />
          <Input name="due" type="date" />
          <Button type="submit" size="sm" disabled={saving}>{saving ? "…" : "Agregar"}</Button>
          <Input name="notes" placeholder="Notas (opcional)" className="sm:col-span-3" />
        </form>
      )}

      {visible.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">Sin tareas pendientes.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <button type="button" onClick={() => complete(t.id)} className="text-gray-300 hover:text-[var(--green-tag)]" title="Completar" aria-label="Marcar tarea como completada">
                <CheckCircle2 className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">{t.title}</p>
                {t.notes && <p className="truncate text-xs text-gray-500">{t.notes}</p>}
              </div>
              {t.due && <span className="text-xs text-gray-400">{fmtDue(t.due)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
