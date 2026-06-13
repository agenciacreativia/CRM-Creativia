import { notFound } from "next/navigation";
import Link from "next/link";
import { Package, MapPin, Plane, Briefcase, Lock } from "lucide-react";
import { getProducto, listOportunidadesPorProducto } from "@/lib/db/productos";
import { Badge } from "@/components/ui/badge";
import { ProductoMediaUpload } from "./media-upload";

type Params = Promise<{ id: string }>;

function money(v: number | null, m: string) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(v);
}

export default async function ProductoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [p, ops] = await Promise.all([getProducto(id), listOportunidadesPorProducto(id)]);
  if (!p) notFound();
  const esTuristea = p.origen === "turistea";

  return (
    <div className="space-y-4">
      <Link href="/productos" className="text-sm text-brand-navy hover:underline">← Productos</Link>

      {/* Header — siempre se ve el título arriba */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-900">{p.nombre}</h1>
            <Badge variant={esTuristea ? "info" : "success"}>{esTuristea ? "Turistea" : "Propio"}</Badge>
            <Badge variant={p.activo ? "success" : "default"}>{p.activo ? "activo" : "inactivo"}</Badge>
            {p.categoria && <Badge variant="default">{p.categoria}</Badge>}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {esTuristea ? "Producto del catálogo Turistea: precio y descripción no editables (los gestiona Turistea)." : "Producto propio de tu agencia."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {esTuristea ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <Lock className="h-3.5 w-3.5" /> Solo lectura
            </span>
          ) : (
            <Link
              href={`/productos/${p.id}/editar`}
              className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy-deep"
            >
              Editar producto
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          {/* Info principal */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="relative h-48 bg-gradient-to-br from-brand-navy via-brand-navy-deep to-[#0a0628]">
              {p.imagen_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imagen_path.startsWith("http") ? p.imagen_path : `/api/storage/producto/${p.imagen_path}`} alt={p.nombre} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: "radial-gradient(circle at 20% 30%, rgba(170,245,43,0.3), transparent 50%), radial-gradient(circle at 80% 70%, rgba(133,194,246,0.2), transparent 50%)",
                }} />
              )}
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-1 text-sm text-gray-600">
                {p.destino && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {p.destino}{p.duracion ? ` · ${p.duracion}` : ""}</p>}
                {p.proveedor && <p className="flex items-center gap-2"><Plane className="h-4 w-4 text-gray-400" /> {p.proveedor}</p>}
              </div>
              {p.descripcion && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Descripción</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.descripcion}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {p.incluye && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Incluye</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.incluye}</p>
                  </div>
                )}
                {p.no_incluye && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">No incluye</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.no_incluye}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Adjuntos / imagen — solo para propios */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Package className="h-4 w-4" /> Imagen y adjuntos
            </h2>
            {esTuristea ? (
              <p className="mt-2 text-sm text-gray-500">Las imágenes y adjuntos de productos Turistea las gestiona Turistea.</p>
            ) : (
              <ProductoMediaUpload productoId={p.id} imagenPath={p.imagen_path} adjuntos={p.adjuntos} />
            )}
          </section>

          {/* Oportunidades asignadas */}
          <section className="rounded-lg border border-gray-200 bg-white">
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <Briefcase className="h-3.5 w-3.5" /> Asignado a oportunidades
                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{ops.length}</span>
              </h2>
            </header>
            {ops.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">Sin oportunidades asignadas.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {ops.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <Link href={`/oportunidades/${o.id}`} className="text-sm font-semibold text-brand-navy hover:underline">
                        {o.nombre}
                      </Link>
                      <p className="text-xs text-gray-500">{o.estado}{o.asignado_nombre ? ` · ${o.asignado_nombre}` : ""}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-700">{money(o.valor, o.moneda)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        <aside className="space-y-3 lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Precio desde</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{money(p.precio_desde, p.moneda)}</p>
            <p className="mt-1 text-xs text-gray-500">{p.moneda}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
