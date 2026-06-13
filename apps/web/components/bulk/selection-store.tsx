"use client";

import { useEffect, useState } from "react";

/**
 * Store de selección masiva, scoped por módulo ("empresas"|"contactos"|
 * "oportunidades"|"productos"). Es un Set en memoria por scope + eventos en
 * `window` para que checkboxes, toolbar de acciones y panel de edición —que
 * viven en distintos puntos del árbol— se sincronicen sin un provider.
 *
 * Eventos:
 *   crm:bulkselection:<scope>        detail { ids }   (selección cambió)
 *   crm:bulkselection:<scope>:clear  (limpiar selección)
 */
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

/** Selecciona exactamente estos ids (usado por "seleccionar todos / filtrados"). */
export function selectAllBulk(scope: string, ids: string[]) {
  writeSet(scope, new Set(ids));
}

/** Limpia la selección de un scope. */
export function clearBulk(scope: string) {
  stores[scope] = new Set();
  window.dispatchEvent(new CustomEvent(`crm:bulkselection:${scope}:clear`));
  window.dispatchEvent(new CustomEvent(`crm:bulkselection:${scope}`, { detail: { ids: [] } }));
}

/** Hook: ids seleccionados actuales de un scope, reactivo a los eventos. */
export function useBulkSelection(scope: string): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds([...readSet(scope)]);
    const onChange = (ev: Event) => {
      const e = ev as CustomEvent<{ ids: string[] }>;
      setIds(e.detail?.ids ?? []);
    };
    const onClear = () => setIds([]);
    window.addEventListener(`crm:bulkselection:${scope}`, onChange);
    window.addEventListener(`crm:bulkselection:${scope}:clear`, onClear);
    return () => {
      window.removeEventListener(`crm:bulkselection:${scope}`, onChange);
      window.removeEventListener(`crm:bulkselection:${scope}:clear`, onClear);
    };
  }, [scope]);
  return ids;
}

/** Checkbox individual de fila. */
export function BulkRowCheckbox({ id, scope = "empresas" }: { id: string; scope?: string }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Sincroniza con el store: "seleccionar todos" / "limpiar" reescriben el set.
    const sync = (ev: Event) => {
      const e = ev as CustomEvent<{ ids: string[] }>;
      setChecked((e.detail?.ids ?? []).includes(id));
    };
    const clear = () => setChecked(false);
    setChecked(readSet(scope).has(id));
    window.addEventListener(`crm:bulkselection:${scope}`, sync);
    window.addEventListener(`crm:bulkselection:${scope}:clear`, clear);
    return () => {
      window.removeEventListener(`crm:bulkselection:${scope}`, sync);
      window.removeEventListener(`crm:bulkselection:${scope}:clear`, clear);
    };
  }, [scope, id]);

  function toggle(next: boolean) {
    setChecked(next);
    const set = new Set(readSet(scope));
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

/** Checkbox "seleccionar todo lo visible" para el encabezado de la tabla. */
export function BulkSelectAllCheckbox({ scope, ids }: { scope: string; ids: string[] }) {
  const selected = useBulkSelection(scope);
  const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));

  function toggle() {
    if (allOn) clearBulk(scope);
    else selectAllBulk(scope, ids);
  }

  return (
    <input
      type="checkbox"
      checked={allOn}
      onChange={toggle}
      className="h-4 w-4 rounded"
      aria-label="Seleccionar todo"
    />
  );
}
