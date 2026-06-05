"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import type { Vista, EntidadVista } from "@/lib/db/vistas";
import { crearVistaAction, eliminarVistaAction } from "./actions";

export function SavedViews({ entidad, vistas }: { entidad: EntidadVista; vistas: Vista[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Vista[]>(vistas);
  const [saving, setSaving] = useState(false);

  const currentQuery = searchParams.toString();
  const activeId = items.find((v) => v.query === currentQuery)?.id ?? null;

  async function guardar() {
    const nombre = window.prompt("Nombre de la vista (ej: Mis activas de alto valor)");
    if (!nombre?.trim()) return;
    setSaving(true);
    const res = await crearVistaAction(entidad, nombre.trim(), currentQuery);
    setSaving(false);
    if (res.ok && res.vista) setItems((l) => [...l, res.vista!]);
  }

  async function eliminar(id: string) {
    setItems((l) => l.filter((v) => v.id !== id));
    await eliminarVistaAction(id);
  }

  function aplicar(v: Vista) {
    router.push(v.query ? `${pathname}?${v.query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((v) => (
        <span
          key={v.id}
          className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
            v.id === activeId ? "border-brand-primary bg-blue-50 text-brand-primary" : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          <button type="button" onClick={() => aplicar(v)} className="inline-flex items-center gap-1">
            <Bookmark className="h-3 w-3" /> {v.nombre}
          </button>
          <button type="button" onClick={() => eliminar(v.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100" title="Eliminar vista">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={guardar}
        disabled={saving || !currentQuery}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40"
        title={currentQuery ? "Guardar filtros actuales" : "Aplicá filtros para poder guardarlos"}
      >
        <BookmarkPlus className="h-3.5 w-3.5" /> Guardar vista
      </button>
    </div>
  );
}
