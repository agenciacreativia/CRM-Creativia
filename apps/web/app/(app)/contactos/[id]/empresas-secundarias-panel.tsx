"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmpresaSecundaria } from "@/lib/db/contacto-empresas";
import {
  agregarEmpresaSecundariaAction,
  quitarEmpresaSecundariaAction,
} from "./empresas-secundarias-actions";

type EmpresaOption = { id: string; nombre: string };

export function EmpresasSecundariasPanel({
  contactoId,
  empresaPrincipalId,
  empresaPrincipalNombre,
  secundarias,
  empresasDisponibles,
  canEdit,
}: {
  contactoId: string;
  empresaPrincipalId: string;
  empresaPrincipalNombre: string;
  secundarias: EmpresaSecundaria[];
  empresasDisponibles: EmpresaOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [empresaSel, setEmpresaSel] = useState("");
  const [rol, setRol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Excluímos la principal + las ya vinculadas para evitar duplicados.
  const ocupadas = new Set([empresaPrincipalId, ...secundarias.map((s) => s.empresa_id)]);
  const disponibles = empresasDisponibles.filter((e) => !ocupadas.has(e.id));

  async function agregar() {
    if (!empresaSel) return;
    setError(null);
    startTransition(async () => {
      const res = await agregarEmpresaSecundariaAction(contactoId, empresaSel, rol);
      if (!res.ok) setError(res.error ?? "Error");
      else {
        setAdding(false);
        setEmpresaSel("");
        setRol("");
        router.refresh();
      }
    });
  }

  function quitar(empresaId: string) {
    if (!confirm("¿Desvincular esta empresa del contacto?")) return;
    startTransition(async () => {
      const res = await quitarEmpresaSecundariaAction(contactoId, empresaId);
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase text-gray-500">
          Empresas vinculadas ({1 + secundarias.length})
        </h2>
        {canEdit && !adding && disponibles.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-3 w-3" /> Vincular otra
          </button>
        )}
      </div>

      <ul className="divide-y divide-gray-100">
        <li className="flex items-center justify-between py-2">
          <div className="min-w-0">
            <Link href={`/empresas/${empresaPrincipalId}`} className="font-medium text-brand-primary hover:underline">
              {empresaPrincipalNombre}
            </Link>
            <p className="text-xs text-gray-500">Empresa principal</p>
          </div>
        </li>
        {secundarias.map((s) => (
          <li key={s.empresa_id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <Link href={`/empresas/${s.empresa_id}`} className="font-medium text-gray-800 hover:underline">
                {s.empresa_nombre}
              </Link>
              <p className="text-xs text-gray-500">{s.rol ?? "Empresa secundaria"}</p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => quitar(s.empresa_id)}
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-status-danger"
                aria-label={`Desvincular ${s.empresa_nombre}`}
                title="Desvincular esta empresa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          {disponibles.length === 0 ? (
            <p className="text-xs text-gray-500">No quedan empresas disponibles para vincular.</p>
          ) : (
            <>
              <select
                value={empresaSel}
                onChange={(e) => setEmpresaSel(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">— elegí empresa —</option>
                {disponibles.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
              <input
                type="text"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                placeholder="Rol en esa empresa (opcional, ej. Comprador)"
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
              />
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={agregar} disabled={!empresaSel}>
                  Vincular
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setEmpresaSel("");
                    setRol("");
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-status-danger">
          {error}
        </p>
      )}
    </section>
  );
}
