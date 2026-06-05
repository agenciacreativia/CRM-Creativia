import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listAuditoria } from "@/lib/db/historial";
import { listUsuarios } from "@/lib/db/usuarios";
import { Badge } from "@/components/ui/badge";
import { AuditoriaFilters } from "./filters";

type SearchParams = Promise<{ q?: string; entidad?: string; asesor?: string; desde?: string; hasta?: string }>;

const ENTIDAD_BADGE: Record<string, "info" | "success" | "warn" | "default"> = {
  oportunidad: "info",
  contacto: "success",
  empresa: "warn",
};
const HREF: Record<string, string> = {
  oportunidad: "/oportunidades",
  contacto: "/contactos",
  empresa: "/empresas",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AuditoriaPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await getSessionUser();
  if (me?.rol !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const [items, usuarios] = await Promise.all([
    listAuditoria({ q: params.q, entidad: params.entidad, asesor: params.asesor, desde: params.desde, hasta: params.hasta }),
    listUsuarios({ activo: "activos" }),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <Link href="/ajustes" className="text-sm text-brand-primary hover:underline">← Ajustes</Link>
        <h1 className="mt-1 text-2xl font-bold">Auditoría</h1>
        <p className="text-sm text-gray-500">Registro de toda la actividad del equipo (creaciones, ediciones, eliminaciones).</p>
      </header>

      <AuditoriaFilters asesores={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))} activos={params} />

      <p className="text-xs text-gray-500">{items.length} evento{items.length === 1 ? "" : "s"}</p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Cuándo</th>
              <th className="px-4 py-2 font-medium">Entidad</th>
              <th className="px-4 py-2 font-medium">Descripción</th>
              <th className="px-4 py-2 font-medium">Autor</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">Sin eventos con esos filtros.</td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{fmt(it.fecha)}</td>
                <td className="px-4 py-2.5">
                  <Link href={`${HREF[it.entidad]}/${it.entity_id}`}>
                    <Badge variant={ENTIDAD_BADGE[it.entidad] ?? "default"}>{it.entidad}</Badge>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-800">{it.descripcion}</td>
                <td className="px-4 py-2.5 text-gray-600">{it.autor ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
