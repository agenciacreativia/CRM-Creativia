"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

export function SearchInput({ name = "q", placeholder = "Buscar..." }: { name?: string; placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const value = params.get(name) ?? "";

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = new URLSearchParams(params);
    if (e.target.value) next.set(name, e.target.value);
    else next.delete(name);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <Input
      type="search"
      placeholder={placeholder}
      defaultValue={value}
      onChange={onChange}
      className="max-w-sm"
    />
  );
}

export function FilterSelect({
  name,
  options,
}: {
  name: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const value = params.get(name) ?? "";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params);
    if (e.target.value) next.set(name, e.target.value);
    else next.delete(name);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <select
      value={value}
      onChange={onChange}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
