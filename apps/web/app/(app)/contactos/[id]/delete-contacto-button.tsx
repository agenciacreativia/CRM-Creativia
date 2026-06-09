"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteContactoAction, getDeleteContactoContext } from "./delete-actions";

type Ctx = Awaited<ReturnType<typeof getDeleteContactoContext>>;

export function DeleteContactoButton({ id, nombre }: { id: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [reasignarA, setReasignarA] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function openModal() {
    setOpen(true);
    setError(null);
    setLoading(true);
    try {
      const data = await getDeleteContactoContext(id);
      setCtx(data);
      // Sugerimos por defecto el primer candidato de la misma empresa
      const sugerido = data.candidatos.find((c) => c.misma_empresa) ?? data.candidatos[0];
      if (sugerido) setReasignarA(sugerido.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setError(null);
    setLoading(true);
    startTransition(async () => {
      const res = await deleteContactoAction(id, reasignarA || null);
      // Si llega acá es porque la action devolvió error (en caso ok hace redirect).
      setLoading(false);
      if (res && !res.ok) setError(res.error ?? "No se pudo borrar");
    });
  }

  const hasOps = (ctx?.oportunidades.length ?? 0) > 0;
  const puedeConfirmar = !loading && (!hasOps || !!reasignarA);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-status-danger transition-colors hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> Eliminar
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-status-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">Eliminar contacto</h2>
                <p className="text-sm text-gray-600">
                  Vas a borrar <strong>{nombre}</strong>. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {loading && !ctx && <p className="text-sm text-gray-500">Cargando…</p>}

            {ctx && hasOps && (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  Este contacto tiene {ctx.oportunidades.length} oportunidad(es) vinculada(s).
                </p>
                <ul className="max-h-24 list-disc overflow-auto pl-5 text-xs text-amber-800">
                  {ctx.oportunidades.slice(0, 8).map((o) => (
                    <li key={o.id}>{o.nombre} · {o.estado}</li>
                  ))}
                  {ctx.oportunidades.length > 8 && <li>… y {ctx.oportunidades.length - 8} más</li>}
                </ul>
                <p className="text-xs text-amber-800">
                  Reasigná las oportunidades a otro contacto antes de borrar:
                </p>
                <select
                  value={reasignarA}
                  onChange={(e) => setReasignarA(e.target.value)}
                  className="w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">— elegí destino —</option>
                  {ctx.candidatos.filter((c) => c.misma_empresa).length > 0 && (
                    <optgroup label="Misma empresa">
                      {ctx.candidatos.filter((c) => c.misma_empresa).map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Otros contactos">
                    {ctx.candidatos.filter((c) => !c.misma_empresa).map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre} · {c.empresa_nombre}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {ctx && !hasOps && (
              <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                El contacto no tiene oportunidades vinculadas. Se puede borrar directamente.
              </p>
            )}

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-status-danger">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={confirm}
                disabled={!puedeConfirmar}
              >
                {loading ? "Eliminando…" : "Eliminar contacto"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
