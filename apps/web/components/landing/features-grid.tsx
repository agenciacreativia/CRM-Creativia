"use client";

import { motion, type Variants } from "motion/react";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  FileText,
  Globe2,
  HeadphonesIcon,
  PiggyBank,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";

const FEATURES = [
  {
    icon: Workflow,
    title: "Pipeline visual",
    text: "Organiza oportunidades en etapas y no pierdas ninguna venta.",
  },
  {
    icon: Sparkles,
    title: "IA Turistea",
    text: "Asistente inteligente que te recomienda acciones para vender más.",
  },
  {
    icon: Globe2,
    title: "360° de viajeros",
    text: "Toda la información, interacciones e historial en un solo lugar.",
  },
  {
    icon: FileText,
    title: "Pólizas y Docs",
    text: "Almacena y comparte pólizas, contratos y vouchers fácilmente.",
  },
  {
    icon: CalendarClock,
    title: "Recordatorios & IA",
    text: "Nunca olvides dar seguimiento con automatizaciones inteligentes.",
  },
  {
    icon: BarChart3,
    title: "Reportes en tiempo real",
    text: "Ventas, ingresos y desempeño de tu agencia al instante.",
  },
  {
    icon: ClipboardList,
    title: "Integraciones clave",
    text: "Conecta con proveedores, pasarelas y más.",
  },
  {
    icon: PiggyBank,
    title: "Cotizaciones & Reservas",
    text: "Crea, envía y convierte cotizaciones en minutos.",
  },
  {
    icon: Target,
    title: "Metas y comisiones",
    text: "Motiva a tu equipo y controla comisiones fácilmente.",
  },
  {
    icon: HeadphonesIcon,
    title: "Soporte en español 24/7",
    text: "Estamos contigo cuando más lo necesites.",
  },
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const title: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
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
          Todo lo que tu agencia necesita, en un solo CRM
        </motion.h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={card}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_0_rgba(31,50,67,0.04)] hover:shadow-[0_8px_24px_rgba(31,50,67,0.08)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#aaf52b]/20 text-[#446900]">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#120b40]">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#47464f]">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
