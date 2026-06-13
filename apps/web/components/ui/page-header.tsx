import Link from "next/link";

/**
 * Header estandarizado de página. Usar arriba de cada vista para que el peso
 * tipográfico, espaciado y el back-link sean idénticos en toda la app.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  right,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="space-y-1">
      {backHref && (
        <Link href={backHref} className="text-sm text-brand-primary hover:underline">
          ← {backLabel ?? "Volver"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
