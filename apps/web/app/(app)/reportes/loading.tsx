import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando reportes…">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-3 w-72" />
      </div>
      {/* Barra de filtros */}
      <Skeleton className="h-16 w-full rounded-lg" />
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
          </div>
        ))}
      </div>
      {/* Gráficos 2×2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="mt-4 h-[260px] w-full rounded-md" />
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando reportes…</span>
    </div>
  );
}
