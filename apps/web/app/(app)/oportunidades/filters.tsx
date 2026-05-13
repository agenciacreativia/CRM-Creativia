"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";

type Props = {
  usuarios: { id: string; nombre: string; rol: "admin" | "asesor" }[];
  pipelines: { id: string; nombre: string }[];
  currentUserId: string | null;
};

const ADVANCED_KEYS = ["asignado", "pipeline", "cierre_desde", "cierre_hasta", "valor_min", "valor_max"];

export function OportunidadFilters({ usuarios, pipelines, currentUserId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const isMine = params.get("mine") === "1";
  const activeCount = ADVANCED_KEYS.reduce((n, k) => (params.get(k) ? n + 1 : n), 0);

  function update(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  function toggleMine() {
    if (isMine) update({ mine: null });
    else update({ mine: "1", asignado: null });
  }

  function clearAll() {
    const next = new URLSearchParams();
    if (params.get("q")) next.set("q", params.get("q")!);
    if (params.get("estado")) next.set("estado", params.get("estado")!);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update({
      asignado: (fd.get("asignado") as string) || null,
      pipeline: (fd.get("pipeline") as string) || null,
      cierre_desde: (fd.get("cierre_desde") as string) || null,
      cierre_hasta: (fd.get("cierre_hasta") as string) || null,
      valor_min: (fd.get("valor_min") as string) || null,
      valor_max: (fd.get("valor_max") as string) || null,
    });
    setOpen(false);
  }

  return (
    <>
      {currentUserId && (
        <button
          type="button"
          onClick={toggleMine}
          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
            isMine
              ? "bg-brand-primary text-white border-brand-primary"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Mis oportunidades
        </button>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        Filtros avanzados
        {activeCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-brand-primary text-white rounded-full">
            {activeCount}
          </span>
        )}
      </Button>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-status-danger underline"
        >
          Limpiar
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-start justify-center pt-[10vh] p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Filtros avanzados</h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Asignado a" htmlFor="asignado">
                <Select id="asignado" name="asignado" defaultValue={params.get("asignado") ?? ""}>
                  <option value="">— todos —</option>
                  <option value="_unassigned">(no asignado)</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre} · {u.rol}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Pipeline" htmlFor="pipeline">
                <Select id="pipeline" name="pipeline" defaultValue={params.get("pipeline") ?? ""}>
                  <option value="">— todos —</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cierre desde" htmlFor="cierre_desde">
                  <Input id="cierre_desde" name="cierre_desde" type="date" defaultValue={params.get("cierre_desde") ?? ""} />
                </Field>
                <Field label="Cierre hasta" htmlFor="cierre_hasta">
                  <Input id="cierre_hasta" name="cierre_hasta" type="date" defaultValue={params.get("cierre_hasta") ?? ""} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor mínimo" htmlFor="valor_min">
                  <Input id="valor_min" name="valor_min" type="number" min="0" step="0.01" defaultValue={params.get("valor_min") ?? ""} />
                </Field>
                <Field label="Valor máximo" htmlFor="valor_max">
                  <Input id="valor_max" name="valor_max" type="number" min="0" step="0.01" defaultValue={params.get("valor_max") ?? ""} />
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button type="submit">Aplicar</Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
