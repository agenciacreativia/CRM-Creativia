"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";

export function AuditoriaFilters({
  asesores,
  activos,
}: {
  asesores: { id: string; nombre: string }[];
  activos: { q?: string; entidad?: string; asesor?: string; desde?: string; hasta?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    router.replace(`${pathname}?${next.toString()}`);
  }
  const has = Object.values(activos).some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 self-center text-xs font-bold uppercase tracking-wider text-gray-500">
        <Filter className="h-3.5 w-3.5" /> Filtros
      </div>
      <div className="flex-1 min-w-44">
        <label className="mb-1 block text-[11px] text-gray-500">Buscar</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            defaultValue={activos.q ?? ""}
            onBlur={(e) => set("q", e.target.value)}
            placeholder="texto en descripción…"
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-7 pr-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-gray-500">Entidad</label>
        <select
          value={activos.entidad ?? ""}
          onChange={(e) => set("entidad", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todas</option>
          <option value="oportunidad">Oportunidades</option>
          <option value="contacto">Contactos</option>
          <option value="empresa">Empresas</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-gray-500">Asesor</label>
        <select
          value={activos.asesor ?? ""}
          onChange={(e) => set("asesor", e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-gray-500">Desde</label>
        <input type="date" value={activos.desde ?? ""} onChange={(e) => set("desde", e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-gray-500">Hasta</label>
        <input type="date" value={activos.hasta ?? ""} onChange={(e) => set("hasta", e.target.value)} className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm" />
      </div>
      {has && (
        <button onClick={() => router.replace(pathname)} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
          <RotateCcw className="h-3.5 w-3.5" /> Limpiar
        </button>
      )}
    </div>
  );
}
