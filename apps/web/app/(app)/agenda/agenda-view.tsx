"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AgendaEvent } from "@/lib/db/agenda";
import { cn } from "@/lib/utils";
import { ActividadIcon } from "@/components/oportunidad/actividad-icon";

const TIPO_COLOR: Record<AgendaEvent["tipo"], string> = {
  llamada: "bg-blue-100 text-blue-800",
  email: "bg-purple-100 text-purple-800",
  whatsapp: "bg-green-100 text-green-800",
  reunion: "bg-yellow-100 text-yellow-800",
  otra: "bg-gray-100 text-gray-700",
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function AgendaView({
  year,
  month,
  events,
  scope,
  currentUserId,
}: {
  year: number;
  month: number;
  events: AgendaEvent[];
  scope: "all" | "me";
  currentUserId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const day = e.fecha_programada.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  function changeMonth(delta: number) {
    const m = month - 1 + delta;
    const newYear = year + Math.floor(m / 12);
    const newMonth = ((m % 12) + 12) % 12 + 1;
    const ym = `${newYear}-${String(newMonth).padStart(2, "0")}`;
    const next = new URLSearchParams(params);
    next.set("ym", ym);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function goToToday() {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const next = new URLSearchParams(params);
    next.set("ym", ym);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function toggleScope() {
    const next = new URLSearchParams(params);
    if (scope === "me") next.delete("scope");
    else next.set("scope", "me");
    router.replace(`${pathname}?${next.toString()}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-gray-100"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <h2 className="text-lg font-bold">
              {MONTHS_ES[month - 1]} {year}
            </h2>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-gray-100"
              aria-label="Mes siguiente"
            >
              →
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="ml-2 px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
            >
              Hoy
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{events.length} actividades</span>
            {currentUserId && (
              <button
                type="button"
                onClick={toggleScope}
                className={cn(
                  "px-3 py-1.5 rounded-md border transition-colors",
                  scope === "me"
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                )}
              >
                Mis actividades
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-7 border-t border-gray-100">
          {WEEKDAYS_ES.map((w) => (
            <div key={w} className="px-2 py-2 text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
              {w}
            </div>
          ))}
          {grid.map((cell, i) => {
            const dayEvents = eventsByDay.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            const isSelected = cell.iso === selectedDay;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(cell.iso)}
                className={cn(
                  "min-h-[80px] border-b border-r border-gray-100 p-1.5 text-left flex flex-col gap-1 transition-colors",
                  !cell.isCurrentMonth && "bg-gray-50 text-gray-400",
                  cell.isCurrentMonth && "hover:bg-blue-50",
                  isSelected && "bg-blue-100 hover:bg-blue-100 ring-2 ring-brand-primary ring-inset",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    isToday && "inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white",
                  )}
                >
                  {cell.day}
                </span>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded truncate",
                        TIPO_COLOR[e.tipo],
                        e.completada && "opacity-50 line-through",
                      )}
                      title={`${e.tipo}: ${e.oportunidad_nombre}${e.contacto_nombre ? " · " + e.contacto_nombre : ""}${e.descripcion ? " — " + e.descripcion : ""}`}
                    >
                      <ActividadIcon tipo={e.tipo} className="mr-1 inline h-3 w-3" />
                      <span className="block truncate font-medium">{e.oportunidad_nombre}</span>
                      {e.contacto_nombre && <span className="block truncate text-[11px] opacity-80">{e.contacto_nombre}</span>}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-gray-500">+{dayEvents.length - 3} más</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <header className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase text-gray-500">
              {new Date(selectedDay + "T12:00:00Z").toLocaleDateString("es", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Cerrar
            </button>
          </header>
          <ul className="divide-y divide-gray-100">
            {selectedEvents.map((e) => (
              <li key={e.id} className={cn("py-2.5", e.completada && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0", TIPO_COLOR[e.tipo])}>
                    <ActividadIcon tipo={e.tipo} className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex flex-col">
                        <Link
                          href={`/oportunidades/${e.oportunidad_id}`}
                          className="text-sm font-medium text-brand-primary hover:underline"
                        >
                          {e.oportunidad_nombre}
                        </Link>
                        {e.contacto_nombre && <span className="text-xs text-gray-500">{e.contacto_nombre}</span>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(e.fecha_programada).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {e.completada && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">completada</span>
                      )}
                    </div>
                    {e.descripcion && (
                      <p className={cn("text-sm text-gray-700 mt-1", e.completada && "line-through")}>
                        {e.descripcion}
                      </p>
                    )}
                    {e.asignado_nombre && (
                      <p className="text-xs text-gray-400 mt-0.5">→ {e.asignado_nombre}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedDay && selectedEvents.length === 0 && (
        <section className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-500 text-center">
          Sin actividades programadas para ese día.
        </section>
      )}
    </>
  );
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  // Lunes = 0
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const daysInMonth = last.getUTCDate();

  type Cell = { iso: string; day: number; isCurrentMonth: boolean };
  const cells: Cell[] = [];

  // Tail of previous month
  const prevLast = new Date(Date.UTC(year, month - 1, 0));
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(prevLast);
    d.setUTCDate(prevLast.getUTCDate() - i);
    cells.push({ iso: isoDate(d), day: d.getUTCDate(), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    cells.push({ iso: isoDate(dt), day: d, isCurrentMonth: true });
  }
  // Head of next month — fill to multiple of 7, at least 6 weeks for stable height
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const dt = new Date(last.iso + "T12:00:00Z");
    dt.setUTCDate(dt.getUTCDate() + 1);
    cells.push({ iso: isoDate(dt), day: dt.getUTCDate(), isCurrentMonth: false });
  }
  return cells;
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
