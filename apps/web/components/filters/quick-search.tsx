"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Buscador dinámico para list views.
 * Sincroniza el query param `?q=` con un input. Debounce de 250ms para no
 * golpear el server en cada tecla. Cliente-puro, el server vuelve a renderizar
 * la tabla filtrando por q sobre las columnas más comunes.
 */
export function QuickSearch({ placeholder = "Buscar…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`);
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative flex-1 sm:flex-none">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-gray-300 bg-white pl-8 pr-2.5 text-sm placeholder-gray-400 focus:border-brand-navy focus:outline-none sm:w-56"
      />
    </div>
  );
}
