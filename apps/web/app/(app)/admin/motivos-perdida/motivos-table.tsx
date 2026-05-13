"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MotivoPerdida } from "@/lib/db/motivos";
import { createMotivoAction, updateMotivoAction, deleteMotivoAction } from "./actions";

export function MotivosTable({ initial }: { initial: MotivoPerdida[] }) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await createMotivoAction(fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este motivo? Solo se puede si no está en uso.")) return;
    startTransition(async () => {
      const res = await deleteMotivoAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nombre</th>
              <th className="px-4 py-2 font-medium text-right">Usado en</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-gray-500 py-6">
                  No hay motivos todavía. Agregá uno abajo.
                </td>
              </tr>
            )}
            {initial.map((m) => (
              <tr key={m.id} className="border-t border-gray-100">
                <td className="px-4 py-2.5">
                  {editingId === m.id ? (
                    <EditForm motivo={m} onDone={() => { setEditingId(null); router.refresh(); }} onError={setError} />
                  ) : (
                    <span className="font-medium">{m.nombre}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {m.oportunidades_count} {m.oportunidades_count === 1 ? "oportunidad" : "oportunidades"}
                </td>
                <td className="px-4 py-2.5 text-right space-x-1">
                  {editingId !== m.id && (
                    <>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(m.id)}>Editar</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(m.id)} className="text-status-danger hover:bg-red-50">Eliminar</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Nuevo motivo</h2>
        <form onSubmit={onCreate} className="flex items-center gap-3">
          <Input name="nombre" placeholder="ej. Cliente sin necesidad inmediata" required className="flex-1" />
          <Button type="submit">+ Agregar</Button>
        </form>
      </section>
    </div>
  );
}

function EditForm({
  motivo,
  onDone,
  onError,
}: {
  motivo: MotivoPerdida;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await updateMotivoAction(motivo.id, fd);
    if (!res.ok) onError(res.error);
    else onDone();
  }
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input name="nombre" defaultValue={motivo.nombre} required className="flex-1" />
      <Button type="submit" size="sm">Guardar</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
    </form>
  );
}
