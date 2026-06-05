"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListOrdered, Check } from "lucide-react";
import { inscribirAction } from "./actions";

type SecOpt = { id: string; nombre: string; pasos: number };

export function EnrollButton({ oportunidadId, secuencias }: { oportunidadId: string; secuencias: SecOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (secuencias.length === 0) return null;

  async function inscribir(id: string, nombre: string) {
    setBusy(true);
    const res = await inscribirAction(id, oportunidadId);
    setBusy(false);
    setOpen(false);
    if (res.ok) {
      setMsg(`Inscripta en “${nombre}”: ${res.creadas} actividades creadas.`);
      router.refresh();
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg(res.error ?? "Error");
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <ListOrdered className="h-4 w-4" /> Inscribir en secuencia
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="surface-white absolute right-0 z-40 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {secuencias.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => inscribir(s.id, s.nombre)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span>{s.nombre}</span>
                <span className="text-xs text-gray-400">{s.pasos} pasos</span>
              </button>
            ))}
          </div>
        </>
      )}

      {msg && (
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" /> {msg}
        </span>
      )}
    </div>
  );
}
