import Link from "next/link";
import type { ListaEnvio } from "@/lib/db/listas-envio";

export function ListasEnvioPanel({ listas }: { listas: ListaEnvio[] }) {
  if (listas.length === 0) {
    return (
      <div className="p-5 text-center text-sm text-gray-500">
        Todavía no tenés listas de envío.{" "}
        <Link href="/campanias/listas/nueva" className="font-semibold text-brand-primary hover:underline">Crear la primera</Link>
        {" "}filtrando contactos por los mismos criterios que en el módulo de Contactos.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {listas.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-gray-50">
          <div className="min-w-0">
            {/* Detalle por lista todavía no existe — mostramos el nombre sin link hasta que se implemente. */}
            <span className="text-sm font-semibold text-brand-primary">
              {l.nombre}
            </span>
            <p className="text-xs text-gray-500">{l.descripcion ?? "—"} · creada {new Date(l.creado_en).toLocaleDateString("es")}</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{l.contactos} contactos</span>
        </li>
      ))}
    </ul>
  );
}
