/**
 * Skeletons de carga reutilizables. Se muestran vía los `loading.tsx` de cada
 * ruta mientras Next resuelve los datos del Server Component (regla UX
 * "loading-states": dar feedback en operaciones > 300ms en vez de pantalla
 * congelada). La animación respeta `prefers-reduced-motion` (corte global).
 *
 * Variante shimmer: gradient diagonal que se desliza, da feedback de "está
 * cargando" más rico que un pulse plano. CSS puro — sin JS extra.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded bg-gray-200/70 ${className}`}
      aria-hidden
    >
      <span className="skeleton-shimmer" />
    </div>
  );
}

/** Skeleton genérico para vistas de lista (toolbar + tabla). */
export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Cargando…">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-56" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando contenido…</span>
    </div>
  );
}
