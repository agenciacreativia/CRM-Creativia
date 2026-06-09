"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SolicitudExterna } from "@/lib/db/reservas-externo";

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  pendiente: "warn", confirmada: "success", bloqueo: "info", emitida: "success", cancelada: "danger",
};
function money(v: number | null, m: string | null) {
  return v == null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: m || "USD", maximumFractionDigits: 0 }).format(v);
}

export function ReservasView({
  solicitudes,
  negocios,
  esPlataforma,
}: {
  solicitudes: SolicitudExterna[];
  negocios: Record<string, { oportunidadId: string; nombre: string }>;
  esPlataforma: boolean;
}) {
  const router = useRouter();

  // Panel mayorista: agregados para la plataforma.
  const activas = solicitudes.filter((s) => s.estado !== "cancelada");
  const kpis = {
    total: activas.length,
    pendientes: activas.filter((s) => s.estado === "pendiente").length,
    confirmadas: activas.filter((s) => s.estado === "confirmada" || s.estado === "emitida" || s.estado === "bloqueo").length,
    montoTotal: activas.reduce((s, r) => s + (r.monto_total ?? 0), 0),
    montoPagado: activas.reduce((s, r) => s + (r.monto_pagado ?? 0), 0),
  };
  const porAgencia = esPlataforma
    ? Object.entries(
        activas.reduce<Record<string, { count: number; monto: number }>>((acc, s) => {
          const k = s.agencia_nombre ?? s.agencia_id ?? "—";
          acc[k] = acc[k] ?? { count: 0, monto: 0 };
          acc[k].count++;
          acc[k].monto += s.monto_total ?? 0;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1].monto - a[1].monto)
        .slice(0, 8)
    : [];
  const fmt = (v: number) => new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-3">
      {esPlataforma && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi label="Reservas activas" value={String(kpis.total)} />
            <Kpi label="Pendientes" value={String(kpis.pendientes)} />
            <Kpi label="Confirmadas/emitidas" value={String(kpis.confirmadas)} />
            <Kpi label="Monto total" value={fmt(kpis.montoTotal)} />
            <Kpi label="Pagado" value={fmt(kpis.montoPagado)} />
          </div>
          {porAgencia.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Top agencias por monto</h3>
              <ul className="space-y-1">
                {porAgencia.map(([nombre, d]) => (
                  <li key={nombre} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{nombre} <span className="text-xs text-gray-400">· {d.count} reserva(s)</span></span>
                    <span className="font-medium text-gray-900">{fmt(d.monto)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="text-sm text-gray-500">
        {solicitudes.length} reserva{solicitudes.length === 1 ? "" : "s"} · en vivo desde Turistea
        <button type="button" onClick={() => router.refresh()} aria-label="Actualizar reservas" title="Actualizar" className="ml-2 inline-flex items-center gap-1 text-xs text-brand-primary hover:underline">
          <RefreshCw className="h-3 w-3" /> actualizar
        </button>
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Plan / Salida</th>
              {esPlataforma
                ? <th className="px-4 py-2 font-medium">Agencia</th>
                : <th className="px-4 py-2 font-medium">Negocio</th>}
              <th className="px-4 py-2 font-medium">Pax</th>
              <th className="px-4 py-2 font-medium text-right">Monto</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Agente</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">Sin reservas todavía.</td></tr>
            )}
            {solicitudes.map((s) => {
              const negocio = negocios[s.id];
              return (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{s.plan_nombre ?? "—"}</div>
                    <div className="text-xs text-gray-400">{s.fecha_salida ?? "sin fecha"} · sol. {s.id.slice(0, 8)}…</div>
                  </td>
                  {esPlataforma ? (
                    <td className="px-4 py-2.5 text-gray-600">{s.agencia_nombre ?? s.agencia_id ?? "—"}</td>
                  ) : (
                    <td className="px-4 py-2.5">
                      {negocio ? (
                        <Link href={`/oportunidades/${negocio.oportunidadId}`} className="text-brand-primary hover:underline">{negocio.nombre}</Link>
                      ) : (
                        <span className="text-xs text-gray-400">creada en el sitio</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-gray-600">{s.adultos + s.ninos + s.bebes}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">
                    {money(s.monto_total, s.moneda)}
                    {s.monto_pagado ? <span className="block text-xs text-green-600">pagado {money(s.monto_pagado, s.moneda)}</span> : null}
                  </td>
                  <td className="px-4 py-2.5"><Badge variant={ESTADO_BADGE[s.estado] ?? "default"}>{s.estado}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{s.nombre_agente ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!esPlataforma && (
        <p className="text-xs text-gray-400">
          Las reservas se crean desde la oportunidad del cliente (panel «Reservas Turistea»). Acá ves todas, también las hechas en el sitio.
        </p>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
