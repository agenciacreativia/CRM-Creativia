import { redirect } from "next/navigation";
import { CreditCard, AlertCircle } from "lucide-react";
import { isPlatformAdmin } from "@/lib/db/planes";
import { listFacturacion } from "@/lib/db/facturacion";
import { stripeConfigurado } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

const ESTADO_BADGE: Record<string, "info" | "success" | "warn" | "danger" | "default"> = {
  trial: "info",
  trial_vencido: "warn",
  activa: "success",
  morosa: "danger",
  cancelada: "default",
  sin_suscripcion: "default",
};
const ESTADO_LABEL: Record<string, string> = {
  trial: "En prueba",
  trial_vencido: "Trial vencido",
  activa: "Activa",
  morosa: "Morosa",
  cancelada: "Cancelada",
  sin_suscripcion: "Sin suscripción",
};

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function FacturacionPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");
  const rows = await listFacturacion();
  const conectado = stripeConfigurado();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Facturación"
        subtitle="Estado de suscripción de cada agencia. El cobro automático se activa al conectar Stripe."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      {/* Estado de Stripe */}
      <div className={`flex items-start gap-3 rounded-lg border p-4 ${conectado ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        {conectado ? <CreditCard className="h-5 w-5 shrink-0 text-green-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />}
        <div>
          <p className="text-sm font-medium text-gray-900">
            {conectado ? "Stripe conectado" : "Stripe pendiente de conectar"}
          </p>
          <p className="text-xs text-gray-600">
            {conectado
              ? "El cobro recurrente y la suspensión por impago están activos."
              : "Cuando estés al aire, agregá STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET al entorno (ambas variables son obligatorias) para activar el cobro automático. Por ahora la gestión de planes y trials es manual."}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Agencia</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Suscripción</th>
              <th className="px-4 py-2 font-medium">Trial / Período</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">Sin agencias todavía.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.tenant_id} className="border-t border-gray-100">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-gray-900">{r.nombre}</div>
                  <div className="text-xs text-gray-400">{r.subdominio}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.plan_nombre ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={ESTADO_BADGE[r.estado_suscripcion] ?? "default"}>{ESTADO_LABEL[r.estado_suscripcion] ?? r.estado_suscripcion}</Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {/* Mostrar período, trial o estado indefinido según corresponda */}
                  {r.periodo_fin
                    ? `hasta ${fmtDate(r.periodo_fin)}`
                    : r.trial_termina_en
                    ? `trial: ${fmtDate(r.trial_termina_en)}`
                    : r.estado_suscripcion === "activa"
                    ? "Activa sin vencimiento"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Próximo paso (post-lanzamiento): conectar Stripe para crear clientes/suscripciones automáticamente, cobrar al terminar el trial y suspender por impago vía webhooks.
      </p>
    </div>
  );
}
