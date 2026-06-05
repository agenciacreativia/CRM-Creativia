"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";
import type { FilterField } from "@/lib/filters/types";

/**
 * "Order by" control: a field select + a direction toggle. Writes `?orden=key:dir`.
 */
export function ListOrder({ fields, paramName = "orden" }: { fields: FilterField[]; paramName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(paramName) ?? "";
  const [key, dir] = raw.split(":");
  const direction = dir === "desc" ? "desc" : "asc";

  function update(nextKey: string, nextDir: "asc" | "desc") {
    const params = new URLSearchParams(searchParams.toString());
    if (nextKey) params.set(paramName, `${nextKey}:${nextDir}`);
    else params.delete(paramName);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="hidden items-center text-gray-400 sm:inline-flex">
        <ArrowDownUp className="h-4 w-4" />
      </span>
      <select
        value={key ?? ""}
        onChange={(e) => update(e.target.value, direction)}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-label="Ordenar por"
      >
        <option value="">Ordenar por…</option>
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => update(key ?? "", direction === "asc" ? "desc" : "asc")}
        disabled={!key}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
        aria-label={direction === "asc" ? "Ascendente" : "Descendente"}
        title={direction === "asc" ? "Ascendente" : "Descendente"}
      >
        {direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </button>
    </div>
  );
}
