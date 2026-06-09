"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export type InlineEditType = "text" | "number" | "date" | "textarea" | "select" | "email";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  /** Human display (e.g. formatted currency). Falls back to value. */
  display?: string;
  type?: InlineEditType;
  options?: Option[];
  placeholder?: string;
  editable?: boolean;
  /** Persist. Return ok:false + error to show a message and keep editing. */
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Click-to-edit field. Enters edit mode on click; saves on blur (click away)
 * or Enter; Escape cancels. Pipedrive-style inline editing.
 */
export function InlineEditField({
  label,
  value,
  display,
  type = "text",
  options,
  placeholder,
  editable = true,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const committed = useRef(value);

  // Re-sincronizamos si el server-component re-rendea con un nuevo valor
  // (p.ej. router.refresh) y no estamos en medio de un edit local.
  useEffect(() => {
    if (!editing) {
      committed.current = value;
      setCurrent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit() {
    setEditing(false);
    if (current === committed.current) return;
    const next = current;
    startTransition(async () => {
      const res = await onSave(next);
      if (res.ok) {
        committed.current = next;
        setError(null);
      } else {
        setError(res.error ?? "No se pudo guardar");
        setCurrent(committed.current); // revert
      }
    });
  }

  function cancel() {
    setCurrent(committed.current);
    setEditing(false);
    setError(null);
  }

  const shownValue = display ?? (value ? value : "—");

  return (
    <div className="group py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>

      {!editing ? (
        <button
          type="button"
          disabled={!editable}
          onClick={() => editable && setEditing(true)}
          className={`mt-0.5 w-full rounded px-1.5 py-1 text-left text-sm transition-colors ${
            editable ? "cursor-text text-gray-900 hover:bg-gray-100" : "cursor-default text-gray-700"
          } ${!value ? "text-gray-400" : ""}`}
          title={editable ? "Clic para editar" : undefined}
        >
          {pending ? <span className="text-gray-400">Guardando…</span> : shownValue}
        </button>
      ) : type === "textarea" ? (
        <textarea
          autoFocus
          value={current}
          placeholder={placeholder}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          rows={3}
          className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      ) : type === "select" ? (
        <select
          autoFocus
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={commit}
          className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoFocus
          type={type}
          value={current}
          placeholder={placeholder}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") cancel();
          }}
          className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      )}

      {error && (
        // Animacion sutil para indicar que el valor fue revertido por error
        <p
          role="alert"
          className="mt-1 animate-pulse text-xs text-status-danger"
        >
          {error} · Se revirtio al valor anterior.
        </p>
      )}
    </div>
  );
}
