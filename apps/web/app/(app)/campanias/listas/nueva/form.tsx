"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBuilder } from "@/components/filters/filter-builder";
import type { FilterField } from "@/lib/filters/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { crearListaAction } from "./actions";

export function NuevaListaForm({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSaving(true);
    const url = new URL(window.location.href);
    const filtros = url.searchParams.get("filtros") ?? "";
    const res = await crearListaAction({ nombre, descripcion: desc, filtrosEncoded: filtros });
    setSaving(false);
    if (!res.ok) setError(res.error ?? "Error");
    else router.push("/campanias");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-status-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Nombre de la lista" required>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Clientes oro AR sin viaje 2026" required />
        </Field>
        <Field label="Descripción">
          <Textarea rows={1} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-600">Filtros (mismos operadores que el módulo Contactos)</p>
        {/* Lista de campaña: siempre segmenta contactos, sin selector de módulo. */}
        <FilterBuilder modules={[{ key: "contacto", label: "Contactos", fields }]} />
        <p className="mt-1 text-xs text-gray-400">Los filtros se almacenan en la URL y se guardan junto con la lista.</p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
        <Button type="submit" disabled={saving || !nombre.trim()}>{saving ? "Guardando…" : "Crear lista"}</Button>
      </div>
    </form>
  );
}
