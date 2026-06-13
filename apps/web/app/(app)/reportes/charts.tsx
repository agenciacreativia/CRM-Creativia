"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const COLORS = ["#272255", "#aaf52b", "#ea6a30", "#85c2f6", "#446900", "#c6c0fd"];

// Texto de leyenda legible en ambos temas. Recharts por defecto lo pinta con el
// color de la serie (navy/verde oscuro → ilegible en dark). El marcador mantiene
// su color; solo forzamos el color del texto.
const legendFmt = (value: string) => <span style={{ color: "var(--ink-soft)" }}>{value}</span>;

export function BarsAsesores({ data }: { data: { nombre: string; ganadas: number; perdidas: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend formatter={legendFmt} />
        <Bar dataKey="ganadas" fill="#aaf52b" name="Ganadas" />
        <Bar dataKey="perdidas" fill="#ea6a30" name="Perdidas" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieMotivos({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend formatter={legendFmt} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LineForecast({ data }: { data: { mes: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="valor" stroke="#272255" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarsEmbudo({ data }: { data: { nombre: string; alcanzaron: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={80} />
        <Tooltip />
        <Bar dataKey="alcanzaron" fill="#272255" name="Alcanzaron" />
      </BarChart>
    </ResponsiveContainer>
  );
}
