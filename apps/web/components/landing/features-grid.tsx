"use client";

import { motion, type Variants } from "motion/react";
import {
  BarChart3,
  Building2,
  CalendarClock,
  PiggyBank,
  Plane,
  ShieldCheck,
  Target,
  Users,
  Workflow,
} from "lucide-react";

const FEATURES = [
  { icon: Workflow, title: "Pipeline visual", text: "Gestioná oportunidades en un embudo claro con hitos y alertas." },
  { icon: Users, title: "Clientes 360°", text: "Historial completo de contacto, viajes, pagos y preferencias." },
  { icon: CalendarClock, title: "Salidas automáticas", text: "Creá salidas con cupos, precios y estados en segundos." },
  { icon: Plane, title: "Maestros turismo", text: "Catálogo de destinos, proveedores y productos siempre actualizado." },
  { icon: PiggyBank, title: "Comisiones", text: "Calculá y liquidá comisiones de vendedores y aliados fácilmente." },
  { icon: Target, title: "Segmentación RFM", text: "Clasificá clientes por Recencia, Frecuencia y Monto." },
  { icon: BarChart3, title: "Dashboards", text: "Indicadores y gráficos en tiempo real para decidir mejor." },
  { icon: Building2, title: "Multi-sucursal", text: "Operá varias oficinas y equipos desde una sola cuenta." },
  { icon: ShieldCheck, title: "Datos seguros", text: "Información respaldada y protegida con altos estándares." },
];

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const card: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  },
};

const title: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  },
};

export function FeaturesGrid() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.h2
          variants={title}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="text-center text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl"
        >
          Todo lo que tu agencia necesita, en un solo lugar
        </motion.h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={card}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_0_rgba(31,50,67,0.04)] hover:shadow-[0_8px_24px_rgba(31,50,67,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#272255]/5 text-[#272255]">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#120b40]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#47464f]">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
