"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
  Plane,
  ClipboardList,
} from "lucide-react";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const mockup: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, delay: 0.35, ease: EASE },
  },
};

// KPI flotantes: cada uno aparece con leve delay distinto
const kpiVariants = (delay: number): Variants => ({
  hidden: { opacity: 0, scale: 0.85, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.6 + delay, ease: EASE },
  },
});

function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
  iconBg,
  trendColor = "text-emerald-600",
  className = "",
  delay = 0,
  floatDelay = 0,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  trendColor?: string;
  className?: string;
  delay?: number;
  floatDelay?: number;
}) {
  return (
    <motion.div
      variants={kpiVariants(delay)}
      initial="hidden"
      animate="show"
      // Float infinito suave después de la entrada
      whileInView={{
        y: [0, -6, 0],
        transition: {
          duration: 4 + floatDelay,
          repeat: Infinity,
          ease: EASE,
          delay: 1.5 + floatDelay,
        },
      }}
      className={
        "absolute z-20 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-[0_12px_32px_rgba(31,50,67,0.12)] backdrop-blur-sm ring-1 ring-black/5 " +
        className
      }
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-4 w-4 text-[#120b40]" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#47464f]">{label}</p>
        <p className="text-base font-extrabold leading-none text-[#120b40]">{value}</p>
        {trend && (
          <p className={`mt-0.5 text-[10px] font-bold ${trendColor}`}>{trend}</p>
        )}
      </div>
    </motion.div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const mockupY = useTransform(scrollY, [0, 600], [0, -60]);
  const personaY = useTransform(scrollY, [0, 600], [0, -30]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-[#f7f9ff] via-[#edf4ff] to-white pb-24 pt-12 lg:pb-32"
    >
      {/* Lineas decorativas de aviones */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-8 top-20 text-[#272255]/15"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1, transition: { duration: 1.2, delay: 0.3 } }}
      >
        <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 50 Q 40 10, 80 30 T 118 8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
        </svg>
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-20 top-24 text-[#ea6a30]/40"
        animate={{
          x: [0, 8, 0],
          y: [0, -4, 0],
          rotate: [-12, -8, -12],
          transition: { duration: 5, repeat: Infinity, ease: EASE },
        }}
      >
        <Plane className="h-7 w-7" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1.05fr_1fr]">
        {/* IZQUIERDA: copy + CTAs */}
        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#272255]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#272255] shadow-sm">
              <Sparkles className="h-3 w-3 text-[#ea6a30]" />
              El CRM #1 para Agencias de Viajes
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#120b40] sm:text-5xl lg:text-[64px]"
          >
            El CRM visual<br />
            para agencias<br />
            de{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">viajes</span>
              <span className="absolute bottom-1.5 left-0 z-0 h-4 w-full bg-[#aaf52b] opacity-70" />
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-md text-base leading-relaxed text-[#47464f]"
          >
            Más que paneles y reportes, Turistea es tu compañero de ventas, impulsado por
            IA, que te ayuda a vender más.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
            <motion.div
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: EASE, delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-7 py-3.5 text-base font-bold text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.45)] transition hover:bg-[#9be022]"
              >
                Empieza gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <a
              href="#producto"
              className="inline-flex items-center gap-2 rounded-full border border-[#272255]/20 bg-white px-7 py-3.5 text-base font-semibold text-[#272255] transition hover:border-[#272255]"
            >
              Ver demo
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-[#47464f]">
              <CheckCircle2 className="h-4 w-4 text-[#446900]" />
              No se requiere tarjeta
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#47464f]">
              <CheckCircle2 className="h-4 w-4 text-[#446900]" />
              Soporte en español
            </span>
          </motion.div>
        </motion.div>

        {/* DERECHA: persona + mockup + KPIs flotantes */}
        <div className="relative">
          {/* KPI top-left: VENTAS */}
          <KpiCard
            label="Ventas (mes)"
            value="$47,250"
            trend="+12%"
            icon={TrendingUp}
            iconBg="bg-[#aaf52b]/30"
            className="-left-2 top-4 sm:left-0"
            delay={0}
            floatDelay={0}
          />

          {/* KPI top-right: NUEVOS CLIENTES */}
          <KpiCard
            label="Nuevos clientes"
            value="36"
            trend="+12%"
            icon={Users}
            iconBg="bg-[#85c2f6]/30"
            className="right-2 top-2 sm:right-6"
            delay={0.1}
            floatDelay={0.5}
          />

          {/* KPI mid-left: RESERVAS */}
          <KpiCard
            label="Reservas"
            value="128"
            trend="+10%"
            icon={Plane}
            iconBg="bg-[#272255]/15"
            className="-left-4 top-1/2 sm:left-2"
            delay={0.2}
            floatDelay={1}
          />

          {/* KPI bot-right: TAREAS */}
          <KpiCard
            label="Tareas pendientes"
            value="14"
            trend="Prioridad alta"
            trendColor="text-[#ea6a30]"
            icon={ClipboardList}
            iconBg="bg-[#ea6a30]/20"
            className="bottom-12 right-0 sm:right-4"
            delay={0.3}
            floatDelay={1.5}
          />

          {/* Persona Tea/Nea (background con parallax) */}
          <motion.div
            style={{ y: personaY }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 1, delay: 0.2, ease: EASE } }}
            className="relative z-0 mx-auto h-[440px] w-full max-w-md"
          >
            <Image
              src="/landing-v2/images/tea-nea-transparente.png"
              alt="Profesional usando Turistea CRM"
              width={800}
              height={1000}
              priority
              className="h-full w-full object-contain"
            />
          </motion.div>

          {/* Mockup laptop+phone superpuesto */}
          <motion.div
            variants={mockup}
            initial="hidden"
            animate="show"
            style={{ y: mockupY }}
            className="absolute inset-x-0 bottom-0 z-10 mx-auto"
          >
            <Image
              src="/landing-v2/images/mockup-laptop-mobile.png"
              alt="Turistea CRM en laptop y mobile"
              width={1448}
              height={900}
              priority
              className="h-auto w-full drop-shadow-[0_24px_48px_rgba(31,50,67,0.18)]"
            />
          </motion.div>
        </div>
      </div>

      {/* Banner AI inferior */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 1.4, ease: EASE } }}
        className="relative z-10 mx-auto mt-12 flex w-fit max-w-2xl items-center gap-3 rounded-2xl border border-[#272255]/15 bg-white px-5 py-3 shadow-[0_12px_32px_rgba(31,50,67,0.08)]"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#aaf52b]">
          <Sparkles className="h-4 w-4 text-[#120b40]" />
        </div>
        <p className="text-sm font-semibold text-[#120b40]">
          <span className="font-bold uppercase tracking-wider text-[#446900]">IA</span>{" "}
          Recomienda el mejor siguiente paso para cada cliente.
        </p>
      </motion.div>
    </section>
  );
}
