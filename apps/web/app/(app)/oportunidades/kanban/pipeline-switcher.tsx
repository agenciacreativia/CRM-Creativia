"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function PipelineSwitcher({
  pipelines,
  current,
}: {
  pipelines: { id: string; nombre: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params);
    next.set("pipeline", e.target.value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={onChange}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
    >
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </select>
  );
}
