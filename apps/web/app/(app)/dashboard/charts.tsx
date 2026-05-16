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

const COLORS = ["#2563EB", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

type Datum = { name: string; value: number };

export function OrigenChart({ data }: { data: Datum[] }) {
  if (data.length === 0) return <Empty>Sin datos de origen</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label={(d) => `${d.name}: ${d.value}`}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EtapaChart({ data }: { data: Datum[] }) {
  if (data.length === 0) return <Empty>Sin oportunidades activas</Empty>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis allowDecimals={false} fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EstadoChart({ data }: { data: Datum[] }) {
  if (data.every((d) => d.value === 0)) return <Empty>Sin oportunidades</Empty>;
  const colors = ["#2563EB", "#10B981", "#EF4444"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis type="number" allowDecimals={false} fontSize={11} />
        <YAxis dataKey="name" type="category" fontSize={11} width={130} />
        <Tooltip />
        <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
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
