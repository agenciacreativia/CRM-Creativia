"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEmpresaAction, getDeleteEmpresaContext } from "./delete-actions";

type Ctx = Awaited<ReturnType<typeof getDeleteEmpresaContext>>;

export function DeleteEmpresaButton({ id, nombre }: { id: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function openModal() {
    setOpen(true);
    setError(null);
    setLoading(true);
    setConfirmText("");
    try {
      const data = await getDeleteEmpresaContext(id);
      setCtx(data);
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
      const res = await deleteEmpresaAction(id);
      setLoading(false);
      if (res && !res.ok) setError(res.error ?? "No se pudo borrar");
    });
  }

  const tieneActivas = (ctx?.oportunidades_activas.length ?? 0) > 0;
  const debeConfirmarTexto = (ctx?.contactos ?? 0) > 0 || (ctx?.oportunidades_cerradas ?? 0) > 0;
  const textoOk = !debeConfirmarTexto || confirmText.trim().toLowerCase() === nombre.trim().toLowerCase();
  const puedeConfirmar = !loading && !!ctx && !tieneActivas && textoOk;

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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-h-[90vh] space-y-4 overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-lg sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-status-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">Eliminar empresa</h2>
                <p className="text-sm text-gray-600">
                  Vas a borrar <strong>{nombre}</strong>. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {loading && !ctx && <p className="text-sm text-gray-500">Cargando…</p>}

            {ctx && tieneActivas && (
              <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-status-danger">
                  No se puede borrar: hay {ctx.oportunidades_activas.length} oportunidad(es) activa(s).
                </p>
                <ul className="max-h-32 list-disc overflow-auto pl-5 text-xs text-red-900">
                  {ctx.oportunidades_activas.map((o) => (
                    <li key={o.id}>{o.nombre}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-900">
                  Ganalas, perdelas o reasignalas a otra empresa antes de borrar.
                </p>
              </div>
            )}

            {ctx && !tieneActivas && debeConfirmarTexto && (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  Esta acción borra <strong>en cascada</strong>:
                </p>
                <ul className="ml-1 list-disc pl-4 text-xs text-amber-900">
                  {ctx.contactos > 0 && <li><strong>{ctx.contactos}</strong> contacto(s) asociado(s)</li>}
                  {ctx.oportunidades_cerradas > 0 && (
                    <li><strong>{ctx.oportunidades_cerradas}</strong> oportunidad(es) cerrada(s) (ganadas/perdidas)</li>
                  )}
                  <li>Notas, documentos, historial y sedes de esta empresa</li>
                </ul>
                <div>
                  <label className="text-xs font-medium text-amber-900">
                    Para confirmar, escribí el nombre de la empresa: <strong>{nombre}</strong>
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={nombre}
                    className="mt-1 w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            )}

            {ctx && !tieneActivas && !debeConfirmarTexto && (
              <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                La empresa no tiene contactos ni oportunidades. Se borrará directamente.
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
                {loading ? "Eliminando…" : "Eliminar empresa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
