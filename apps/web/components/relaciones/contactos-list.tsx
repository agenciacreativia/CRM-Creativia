import Link from "next/link";
import { Users, Mail, Phone } from "lucide-react";
import type { ContactoRel } from "@/lib/db/relaciones";

export function ContactosList({ items }: { items: ContactoRel[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          <Users className="h-3.5 w-3.5" /> Contactos
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{items.length}</span>
        </h2>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-400">Sin contactos.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-gray-50">
              <div className="min-w-0">
                <Link href={`/contactos/${c.id}`} className="text-sm font-semibold text-brand-primary hover:underline">
                  {c.nombre}
                </Link>
                <p className="text-xs text-gray-500">{c.cargo ?? "—"}{c.asignado_nombre ? ` · ${c.asignado_nombre}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                {c.telefono && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefono}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
