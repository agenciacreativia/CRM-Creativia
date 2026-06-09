"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Tag, X } from "lucide-react";
import {
  bulkReasignarEmpresasAction,
  bulkCambiarEstadoEmpresasAction,
} from "./bulk-empresas-actions";

type UsuarioOption = { id: string; nombre: string };

/**
 * Barra inferior flotante. Aparece cuando hay >=1 fila seleccionada.
 * Se conecta al checkbox vía el evento custom `crm:bulkselection` que dispara
 * `BulkSelectionProvider`. Esto mantiene el patrón sin instalar un store.
 */
export function BulkEmpresasBar({ usuarios }: { usuarios: UsuarioOption[] }) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function handler(ev: Event) {
      const e = ev as CustomEvent<{ ids: string[] }>;
      setIds(e.detail?.ids ?? []);
    }
    window.addEventListener("crm:bulkselection:empresas", handler);
    return () => window.removeEventListener("crm:bulkselection:empresas", handler);
  }, []);

  function clear() {
    window.dispatchEvent(new CustomEvent("crm:bulkselection:empresas:clear"));
    setIds([]);
  }

  async function reasignar(asignadoId: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await bulkReasignarEmpresasAction(ids, asignadoId);
      if (!res.ok) {
        setError(res.error ?? "Error");
        return;
      }
      clear();
      router.refresh();
    });
  }

  async function cambiarEstado(estado: "prospecto" | "cliente" | "inactivo") {
    setError(null);
    startTransition(async () => {
      const res = await bulkCambiarEstadoEmpresasAction(ids, estado);
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
    // En mobile la barra queda full-width al pie de la pantalla con safe-area;
    // en sm+ se centra como una "isla" flotante.
    <div className="fixed inset-x-0 bottom-0 z-40 sm:bottom-4 sm:flex sm:justify-center sm:px-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white px-3 py-2 shadow-lg sm:gap-3 sm:rounded-lg sm:border sm:px-4">
        <span className="text-sm font-medium text-gray-700">
          <strong>{ids.length}</strong> seleccionada(s)
        </span>

        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              reasignar(v === "__null__" ? null : v);
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
              cambiarEstado(v as "prospecto" | "cliente" | "inactivo");
              e.target.value = "";
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Cambiar estado…</option>
            <option value="prospecto">Prospecto</option>
            <option value="cliente">Cliente</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

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

/** Checkbox individual para una fila. */
export function BulkRowCheckbox({ id, scope = "empresas" }: { id: string; scope?: string }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const clear = () => setChecked(false);
    window.addEventListener(`crm:bulkselection:${scope}:clear`, clear);
    return () => window.removeEventListener(`crm:bulkselection:${scope}:clear`, clear);
  }, [scope]);

  function toggle(next: boolean) {
    setChecked(next);
    const set = readSet(scope);
    if (next) set.add(id);
    else set.delete(id);
    writeSet(scope, set);
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => toggle(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="rounded"
      aria-label="Seleccionar fila"
    />
  );
}

// Nota: en v1 dejamos solo checkbox por fila. Un "Seleccionar todas" en el
// header requiere mantener sync con cada checkbox hijo y se vuelve propenso
// a races. Si después se necesita, mejor migrar a useReducer + Context en vez
// de eventos custom.

// ---- Selection store (module-scoped Set per scope) ----
const stores: Record<string, Set<string>> = {};
function readSet(scope: string): Set<string> {
  if (!stores[scope]) stores[scope] = new Set();
  return stores[scope];
}
function writeSet(scope: string, next: Set<string>) {
  stores[scope] = next;
  window.dispatchEvent(
    new CustomEvent(`crm:bulkselection:${scope}`, { detail: { ids: [...next] } }),
  );
}
