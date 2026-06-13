import Link from "next/link";
import { Building2 } from "lucide-react";
import type { EmpresaRel } from "@/lib/db/relaciones";

export function EmpresasList({ items }: { items: EmpresaRel[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          <Building2 className="h-3.5 w-3.5" /> Empresas asociadas
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{items.length}</span>
        </h2>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-400">Sin empresas asociadas.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-gray-50">
              <Link href={`/empresas/${e.id}`} className="text-sm font-semibold text-brand-navy hover:underline">
                {e.nombre}
              </Link>
              {e.estado && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{e.estado}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
