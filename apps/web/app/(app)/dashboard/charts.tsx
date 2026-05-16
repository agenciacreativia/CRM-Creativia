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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
      {children}
    </div>
  );
}
