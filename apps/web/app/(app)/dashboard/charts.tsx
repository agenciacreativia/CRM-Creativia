"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Turistea-aligned palette. First entries are brand-led; the rest fan out
// so multi-segment charts (origin pie, etc.) stay readable.
const COLORS = [
  "#272255", // brand navy
  "#95DE00", // brand green
  "#FF793E", // brand orange
  "#85C2F6", // brand sky
  "#5B47E3", // soft indigo (companion)
  "#34c98a", // mint green
  "#f0708a", // soft rose
  "#FFB37A", // warm peach
];

type Datum = { name: string; value: number };

const TOOLTIP_STYLE = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.65)",
  background: "rgba(255,255,255,0.95)",
  boxShadow: "0 14px 30px -8px rgba(39,34,85,0.3)",
  fontSize: 12,
};

export function OrigenChart({ data }: { data: Datum[] }) {
  if (data.length === 0) return <Empty>Sin datos de origen</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={80}
          innerRadius={45}
          paddingAngle={3}
          label={(d) => `${d.name}: ${d.value}`}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EtapaChart({ data }: { data: Datum[] }) {
  if (data.length === 0) return <Empty>Sin oportunidades activas</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="35%">
        <defs>
          <linearGradient id="etapaBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a32a0" />
            <stop offset="100%" stopColor="#272255" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,34,85,0.08)" />
        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(39,34,85,0.04)" }} />
        <Bar dataKey="value" fill="url(#etapaBarGrad)" radius={[10, 10, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EstadoChart({ data }: { data: Datum[] }) {
  if (data.every((d) => d.value === 0)) return <Empty>Sin oportunidades</Empty>;
  const colors = ["#272255", "#95DE00", "#f0708a"]; // activas · ganadas · perdidas
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,34,85,0.08)" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(39,34,85,0.04)" }} />
        <Bar dataKey="value" radius={[10, 10, 4, 4]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MotivosChart({ data }: { data: Datum[] }) {
  if (data.length === 0) return <Empty>Sin oportunidades perdidas</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,34,85,0.08)" />
        <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis dataKey="name" type="category" fontSize={11} width={130} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(39,34,85,0.04)" }} />
        <Bar dataKey="value" fill="#FF793E" radius={[4, 10, 10, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type ForecastDatum = { mes: string; valor: number };
export function ForecastChart({ data, moneda }: { data: ForecastDatum[]; moneda: string }) {
  if (data.every((d) => d.valor === 0)) return <Empty>Sin oportunidades con fecha de cierre</Empty>;
  const fmt = (n: number) =>
    new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%">
        <defs>
          <linearGradient id="forecastBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#95DE00" />
            <stop offset="100%" stopColor="#7bc100" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,34,85,0.08)" />
        <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmt} fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "rgba(39,34,85,0.04)" }}
          formatter={(v) => {
            const n = typeof v === "number" ? v : Number(v ?? 0);
            return new Intl.NumberFormat("es", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);
          }}
        />
        <Bar dataKey="valor" fill="url(#forecastBarGrad)" radius={[10, 10, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type EmbudoDatum = { nombre: string; alcanzaron: number; conversion_pct: number | null };
export function EmbudoChart({ data }: { data: EmbudoDatum[] }) {
  if (data.length === 0) return <Empty>Sin embudo configurado</Empty>;
  // Barras horizontales decrecientes — visualmente lee como embudo.
  const max = Math.max(...data.map((d) => d.alcanzaron), 1);
  const height = Math.max(220, data.length * 46);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.alcanzaron / max) * 100;
        return (
          <div key={d.nombre} className="flex items-center gap-3" style={{ minHeight: 40 }}>
            <div className="w-28 text-xs text-gray-600 truncate text-right shrink-0">{d.nombre}</div>
            <div className="flex-1 relative h-9 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-lg flex items-center justify-end pr-3 text-xs font-semibold text-white transition-all"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg, #3a32a0 0%, #272255 70%, #1c1840 100%)",
                  minWidth: 40,
                }}
              >
                {d.alcanzaron}
              </div>
            </div>
            <div className="w-16 text-xs text-gray-500 shrink-0 text-right">
              {i === 0 ? "—" : d.conversion_pct != null ? `${d.conversion_pct}%` : "—"}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
        <div className="w-28 shrink-0" />
        <div className="flex-1">Cantidad alcanzada</div>
        <div className="w-16 shrink-0 text-right">Conv. vs etapa previa</div>
      </div>
      {/* Height hint for parents that lay out fixed-size grids. */}
      <div className="hidden" style={{ height }} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
      {children}
    </div>
  );
}
