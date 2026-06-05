import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getFilterFields } from "@/lib/filters/server";
import { decodeFilterSpec, specHasConditions } from "@/lib/filters/types";
import { rowMatches } from "@/lib/filters/evaluate";
import { listContactos } from "@/lib/db/contactos";
import { listEmpresas } from "@/lib/db/empresas";
import { listOportunidades } from "@/lib/db/oportunidades";
import { FilterBuilder } from "@/components/filters/filter-builder";

type Modulo = "contacto" | "empresa" | "oportunidad";

type SearchParams = Promise<{ modulo?: Modulo; filtros?: string }>;

const MODULOS: { value: Modulo; label: string; href: (id: string) => string }[] = [
  { value: "contacto", label: "Contactos", href: (id) => `/contactos/${id}` },
  { value: "empresa", label: "Empresas", href: (id) => `/empresas/${id}` },
  { value: "oportunidad", label: "Oportunidades", href: (id) => `/oportunidades/${id}` },
];

export default async function BusquedaAvanzadaPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const params = await searchParams;
  const modulo: Modulo = (params.modulo as Modulo) ?? "oportunidad";
  const fields = await getFilterFields(modulo);
  const spec = decodeFilterSpec(params.filtros);
  const hasAdvanced = specHasConditions(spec);

  let rows: Array<{ id: string } & Record<string, unknown>> = [];
  if (hasAdvanced) {
    if (modulo === "contacto") rows = (await listContactos({})) as Array<{ id: string } & Record<string, unknown>>;
    else if (modulo === "empresa") rows = (await listEmpresas({})) as Array<{ id: string } & Record<string, unknown>>;
    else rows = (await listOportunidades({})) as Array<{ id: string } & Record<string, unknown>>;
  }
  const matches = hasAdvanced && spec ? rows.filter((r) => rowMatches(r, spec, fields)) : [];
  const cfg = MODULOS.find((m) => m.value === modulo)!;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Búsqueda avanzada</h1>
        <p className="text-sm text-gray-500">Elegí un módulo y armá condiciones con operadores según el tipo de campo. Los campos personalizados de tu agencia aparecen automáticamente.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
          {MODULOS.map((m) => (
            <Link
              key={m.value}
              href={`/buscar?modulo=${m.value}`}
              className={`rounded px-3 py-1.5 text-sm font-medium ${modulo === m.value ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {m.label}
            </Link>
          ))}
        </div>
        <FilterBuilder fields={fields} />
      </div>

      {!hasAdvanced ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Definí al menos una condición en <em>Filtros</em> para ver resultados.
        </p>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{cfg.label} · {matches.length} resultado{matches.length === 1 ? "" : "s"}</h2>
          </header>
          {matches.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-500">Sin coincidencias.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {matches.slice(0, 200).map((r) => {
                const nombre = String((r as { nombre?: string }).nombre ?? r.id);
                return (
                  <li key={String(r.id)} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-gray-50">
                    <Link href={cfg.href(String(r.id))} className="text-sm font-semibold text-brand-navy hover:underline">{nombre}</Link>
                  </li>
                );
              })}
            </ul>
          )}
          {matches.length > 200 && <p className="px-5 py-2 text-xs text-gray-400">Mostrando los primeros 200. Refiná los filtros para ver el resto.</p>}
        </section>
      )}
    </div>
  );
}
