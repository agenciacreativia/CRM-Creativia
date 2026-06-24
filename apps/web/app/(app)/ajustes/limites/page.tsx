import { redirect } from "next/navigation";
import { Gauge, Cpu, Database, HardDrive, Activity, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { isPlatformAdmin } from "@/lib/db/planes";
import {
  getCurrentTier,
  getUsoGlobal,
  getSaludDB,
  calcularCapacidad,
  nextTier,
  TIERS,
  type Capacidad,
} from "@/lib/db/sistema";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(n);
}

function semaforo(rec: Capacidad["recomendacion"]) {
  if (rec === "upgrade") return { color: "bg-status-danger", text: "Subir tier", textColor: "text-status-danger" };
  if (rec === "atento") return { color: "bg-amber-500", text: "Atento", textColor: "text-amber-700" };
  return { color: "bg-emerald-500", text: "OK", textColor: "text-emerald-700" };
}

function CapacidadBar({ item }: { item: Capacidad }) {
  const s = semaforo(item.recomendacion);
  const pct = Math.min(100, item.porcentaje);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{item.dimension}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {fmt(item.valorActual)} de {fmt(item.techo)} · <span className={s.textColor}>{s.text}</span>
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.textColor} bg-opacity-10`}>{item.porcentaje}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default async function LimitesPage() {
  if (!(await isPlatformAdmin())) redirect("/ajustes");

  const [tier, uso, salud] = await Promise.all([
    Promise.resolve(getCurrentTier()),
    getUsoGlobal(),
    getSaludDB(),
  ]);

  const capacidades = calcularCapacidad(uso, tier);
  const proximo = nextTier(tier);
  const debeUpgrade = capacidades.some((c) => c.recomendacion === "upgrade");
  const atento = capacidades.some((c) => c.recomendacion === "atento");

  const saludOk = salud.ok && salud.pingMs < 500 && salud.countOportunidadMs < 1000;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Límites y capacidad"
        subtitle="Tier actual, uso global, salud de la base y umbrales recomendados antes de hacer upgrade."
        backHref="/ajustes"
        backLabel="Ajustes"
      />

      {/* === Banner de recomendación === */}
      {debeUpgrade && proximo && (
        <div className="flex items-start gap-3 rounded-lg border border-status-danger/30 bg-status-danger/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" />
          <div>
            <p className="text-sm font-semibold text-status-danger">Recomendamos subir a {proximo.nombre} (USD {proximo.precioMesUsd}/mes)</p>
            <p className="mt-1 text-xs text-gray-600">
              Alguna dimensión llegó al 80%+ del techo recomendado para <b>{tier.nombre}</b>. El upgrade duplica la
              capacidad (RAM {tier.ramGb}GB→{proximo.ramGb}GB · conexiones {tier.conexionesAprox}→{proximo.conexionesAprox} ·
              RPS sostenido {tier.rpsSostenido}→{proximo.rpsSostenido}).
            </p>
          </div>
        </div>
      )}
      {!debeUpgrade && atento && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300/40 bg-amber-50 p-4">
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Estás creciendo. Hay dimensiones al 60%+; planeá el upgrade a <b>{proximo?.nombre ?? "—"}</b> antes de quedarte corto.
          </p>
        </div>
      )}
      {!debeUpgrade && !atento && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-300/40 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">El sistema tiene margen sobrado en el tier actual. Podés seguir vendiendo tranquilo.</p>
        </div>
      )}

      {/* === Tier actual === */}
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Tier actual de Supabase Compute</p>
            <h2 className="mt-1 text-3xl font-bold text-gray-900">{tier.nombre}</h2>
            <p className="mt-1 text-sm text-gray-500">USD {tier.precioMesUsd}/mes</p>
          </div>
          <Gauge className="h-10 w-10 text-brand-primary opacity-30" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={HardDrive} label="RAM" value={`${tier.ramGb} GB`} />
          <Kpi icon={Cpu} label="CPU" value={`${tier.cpuCores}-core`} />
          <Kpi icon={Database} label="Conexiones aprox" value={fmt(tier.conexionesAprox)} />
          <Kpi icon={Activity} label="RPS sostenido" value={fmt(tier.rpsSostenido)} hint="webhook leads" />
        </div>
      </section>

      {/* === Uso actual === */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Uso actual (cross-tenant)</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={Database} label="Agencias totales" value={fmt(uso.tenants)} hint={`${fmt(uso.tenantsActivos)} activas (30d)`} />
          <Kpi icon={Database} label="Oportunidades" value={fmt(uso.oportunidades)} />
          <Kpi icon={Database} label="Contactos" value={fmt(uso.contactos)} />
          <Kpi icon={Database} label="Empresas" value={fmt(uso.empresas)} />
        </div>
      </section>

      {/* === Capacidad por dimensión === */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Capacidad por dimensión</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {capacidades.map((c) => (
            <CapacidadBar key={c.dimension} item={c} />
          ))}
        </div>
      </section>

      {/* === Salud de la BD === */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Salud de la base (medido ahora)</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Kpi
            icon={Activity}
            label="Ping (tenant select)"
            value={`${salud.pingMs} ms`}
            hint={salud.pingMs < 200 ? "Ideal" : salud.pingMs < 500 ? "OK" : "Lento"}
          />
          <Kpi
            icon={Database}
            label="Count oportunidad"
            value={`${salud.countOportunidadMs} ms`}
            hint={salud.countOportunidadMs < 300 ? "Ideal" : salud.countOportunidadMs < 1000 ? "OK" : "Lento"}
          />
          <div className={`rounded-lg border p-4 ${saludOk ? "border-emerald-300/40 bg-emerald-50" : "border-amber-300/40 bg-amber-50"}`}>
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600">
              <Activity className="h-3.5 w-3.5" />
              Estado general
            </div>
            <p className={`text-lg font-semibold ${saludOk ? "text-emerald-800" : "text-amber-800"}`}>
              {saludOk ? "Saludable" : "Atento"}
            </p>
          </div>
        </div>
      </section>

      {/* === Tabla comparativa de tiers === */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Comparativa de tiers</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">RAM</th>
                <th className="px-4 py-2 font-medium">Conexiones</th>
                <th className="px-4 py-2 font-medium">RPS sostenido</th>
                <th className="px-4 py-2 font-medium">Agencias activas</th>
                <th className="px-4 py-2 font-medium">Records/tabla</th>
                <th className="px-4 py-2 font-medium text-right">USD/mes</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(TIERS).map((t) => {
                const actual = t.id === tier.id;
                return (
                  <tr key={t.id} className={`border-t border-gray-100 ${actual ? "bg-brand-navy/[0.04]" : ""}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {t.nombre}
                      {actual && <span className="ml-2 rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Actual</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{t.ramGb} GB</td>
                    <td className="px-4 py-2.5 text-gray-600">~{t.conexionesAprox}</td>
                    <td className="px-4 py-2.5 text-gray-600">~{t.rpsSostenido}</td>
                    <td className="px-4 py-2.5 text-gray-600">~{fmt(t.agenciasActivasMax)}</td>
                    <td className="px-4 py-2.5 text-gray-600">~{fmt(t.recordsPorTablaMax)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">{t.precioMesUsd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Cifras estimadas según stress tests del 2026-06-23 (ver scripts/load-test/stress_caps.py y stress_soak.py).
          Recalcular ante cambios mayores de arquitectura.
        </p>
      </section>
    </div>
  );
}
