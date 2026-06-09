"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Tag, Trash2, X } from "lucide-react";
import {
  bulkReasignarContactosAction,
  bulkCambiarOrigenContactosAction,
  bulkEliminarContactosAction,
} from "./bulk-contactos-actions";

type UsuarioOption = { id: string; nombre: string };

export function BulkContactosBar({ usuarios }: { usuarios: UsuarioOption[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function handler(ev: Event) {
      const e = ev as CustomEvent<{ ids: string[] }>;
      setIds(e.detail?.ids ?? []);
    }
    window.addEventListener("crm:bulkselection:contactos", handler);
    return () => window.removeEventListener("crm:bulkselection:contactos", handler);
  }, []);

  function clear() {
    window.dispatchEvent(new CustomEvent("crm:bulkselection:contactos:clear"));
    setIds([]);
  }

  function run<T>(fn: () => Promise<T & { ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Error");
        return;
      }
      clear();
      router.refresh();
    });
  }

  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 sm:bottom-4 sm:flex sm:justify-center sm:px-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white px-3 py-2 shadow-lg sm:gap-3 sm:rounded-lg sm:border sm:px-4">
        <span className="text-sm font-medium text-gray-700">
          <strong>{ids.length}</strong> seleccionado(s)
        </span>

        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              run(() => bulkReasignarContactosAction(ids, v === "__null__" ? null : v));
              e.target.value = "";
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Reasignar a…</option>
            <option value="__null__">(sin asignar)</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
          <Tag className="h-3.5 w-3.5 text-gray-500" />
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              run(() =>
                bulkCambiarOrigenContactosAction(
                  ids,
                  v === "__null__" ? null : (v as "empresa" | "linkedin" | "cold_call" | "evento" | "otro"),
                ),
              );
              e.target.value = "";
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Cambiar origen…</option>
            <option value="__null__">(sin especificar)</option>
            <option value="empresa">Empresa</option>
            <option value="linkedin">LinkedIn</option>
            <option value="cold_call">Cold call</option>
            <option value="evento">Evento</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!confirm(`¿Eliminar ${ids.length} contacto(s) seleccionado(s)? No se podrá deshacer.`)) return;
            run(() => bulkEliminarContactosAction(ids));
          }}
          className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-status-danger hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" /> Eliminar
        </button>

        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Limpiar selección"
          title="Limpiar selección"
        >
          <X className="h-4 w-4" />
        </button>

        {error && (
          <p className="ml-2 max-w-xs truncate text-xs text-status-danger" title={error}>
            ⚠ {error}
          </p>
        )}
      </div>
    </div>
  );
}
