"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import type { Actividad } from "@/lib/db/actividades";
import {
  createActividadAction,
  toggleActividadAction,
  deleteActividadAction,
} from "./actividades-actions";
import { cn } from "@/lib/utils";

const TIPO_ICONS: Record<Actividad["tipo"], string> = {
  llamada: "📞",
  email: "✉️",
  whatsapp: "💬",
  reunion: "📅",
  otra: "•",
};

const TIPO_LABEL: Record<Actividad["tipo"], string> = {
  llamada: "Llamada",
  email: "Email",
  whatsapp: "WhatsApp",
  reunion: "Reunión",
  otra: "Otra",
};

export function ActividadesSection({
  oportunidadId,
  initial,
  soloTipo,
  bare = false,
}: {
  oportunidadId: string;
  initial: Actividad[];
  /** Restrict to a single activity type (used by the detail tabs). */
  soloTipo?: Actividad["tipo"];
  /** Render without the outer card chrome. */
  bare?: boolean;
}) {
  const [filter, setFilter] = useState<"todas" | "pendientes" | "completadas">("todas");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const byType = soloTipo ? initial.filter((a) => a.tipo === soloTipo) : initial;
  const filtered = byType.filter((a) => {
    if (filter === "pendientes") return !a.completada;
    if (filter === "completadas") return a.completada;
    return true;
  });

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.append("oportunidad_id", oportunidadId);
    const res = await createActividadAction(fd);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    setShowAdd(false);
    router.refresh();
  }

  function onToggle(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleActividadAction(id, !current);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    startTransition(async () => {
      const res = await deleteActividadAction(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const Wrapper = bare ? "div" : "section";

  return (
    <Wrapper className={bare ? "" : "bg-white border border-gray-200 rounded-lg p-6"}>
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase text-gray-500">
          {soloTipo ? TIPO_LABEL[soloTipo] : "Actividades"}{" "}
          <span className="text-gray-400">({byType.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "todas" | "pendientes" | "completadas")}
            className="w-auto"
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="completadas">Completadas</option>
          </Select>
          <Button type="button" size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancelar" : "+ Agregar"}
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-status-danger mb-3">{error}</div>
      )}

      {showAdd && (
        <form onSubmit={onAdd} className="bg-gray-50 border border-gray-200 rounded p-4 space-y-3 mb-4">
          {soloTipo ? (
            <>
              <input type="hidden" name="tipo" value={soloTipo} />
              <Field label="Fecha programada" htmlFor="fecha_programada" hint="Dejá vacío si es ad-hoc">
                <Input id="fecha_programada" name="fecha_programada" type="datetime-local" />
              </Field>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
              <Field label="Tipo" htmlFor="tipo">
                <Select id="tipo" name="tipo" defaultValue="llamada">
                  <option value="llamada">📞 Llamada</option>
                  <option value="email">✉️ Email</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="reunion">📅 Reunión</option>
                  <option value="otra">• Otra</option>
                </Select>
              </Field>
              <Field label="Fecha programada" htmlFor="fecha_programada" hint="Dejá vacío si es ad-hoc">
                <Input id="fecha_programada" name="fecha_programada" type="datetime-local" />
              </Field>
            </div>
          )}
          <Field label="Descripción" htmlFor="descripcion">
            <Textarea id="descripcion" name="descripcion" rows={2} placeholder="¿De qué se trata?" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="completada" value="true" className="rounded" />
            Marcar como completada ya
          </label>
          <Button type="submit" size="sm">Guardar actividad</Button>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {filter === "todas" ? "No hay actividades todavía." : `No hay actividades ${filter}.`}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {filtered.map((a) => (
            <li key={a.id} className={cn("py-3 flex items-start gap-3", a.completada && "opacity-60")}>
              <input
                type="checkbox"
                checked={a.completada}
                onChange={() => onToggle(a.id, a.completada)}
                className="mt-1.5 rounded"
                aria-label="Completada"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span>{TIPO_ICONS[a.tipo]}</span>
                  <span className="text-sm font-medium text-gray-900">{TIPO_LABEL[a.tipo]}</span>
                  {a.fecha_programada && (
                    <span className="text-xs text-gray-500">· {formatDateTime(a.fecha_programada)}</span>
                  )}
                </div>
                {a.descripcion && (
                  <p className={cn("text-sm text-gray-700 mt-1 whitespace-pre-wrap", a.completada && "line-through")}>
                    {a.descripcion}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {a.creado_por_nombre ?? "—"} · creada {formatDateTime(a.creado_en)}
                  {a.completada && a.fecha_completada && ` · completada ${formatDateTime(a.fecha_completada)}`}
                </p>
              </div>
              <button
                onClick={() => onDelete(a.id)}
                className="text-xs text-gray-400 hover:text-status-danger"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Wrapper>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
