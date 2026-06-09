"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

type Opt = { id: string; nombre: string };

export function ReportesFiltersBar({
  pipelines,
  productos,
  asesores,
  activos,
}: {
  pipelines: Opt[];
  productos: Opt[];
  asesores: Opt[];
  activos: { pipeline?: string; producto?: string; asesor?: string; desde?: string; hasta?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }
  function reset() {
    router.replace(pathname);
  }

  const has = Object.values(activos).some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 self-center text-xs font-bold uppercase tracking-wider text-gray-500">
        <Filter className="h-3.5 w-3.5" /> Filtros
      </div>
      <div>
        <label htmlFor="filtro-embudo" className="mb-1 block text-[11px] text-gray-500">Embudo</label>
        <select
          id="filtro-embudo"
          value={activos.pipeline ?? ""}
          onChange={(e) => set("pipeline", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="filtro-producto" className="mb-1 block text-[11px] text-gray-500">Producto</label>
        <select
          id="filtro-producto"
          value={activos.producto ?? ""}
          onChange={(e) => set("producto", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="filtro-asesor" className="mb-1 block text-[11px] text-gray-500">Asesor</label>
        <select
          id="filtro-asesor"
          value={activos.asesor ?? ""}
          onChange={(e) => set("asesor", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="filtro-desde" className="mb-1 block text-[11px] text-gray-500">Desde</label>
        <input
          id="filtro-desde"
          type="date"
          value={activos.desde ?? ""}
          onChange={(e) => set("desde", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="filtro-hasta" className="mb-1 block text-[11px] text-gray-500">Hasta</label>
        <input
          id="filtro-hasta"
          type="date"
          value={activos.hasta ?? ""}
          onChange={(e) => set("hasta", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        />
      </div>
      {has && (
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
          <RotateCcw className="h-3.5 w-3.5" /> Limpiar
        </button>
      )}
    </div>
  );
}
