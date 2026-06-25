"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Plane,
  Sparkles,
  TrendingUp,
  Users,
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

const bgIn: Variants = {
  hidden: { opacity: 0, scale: 1.04 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: EASE },
  },
};

const mockupIn: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.95, delay: 0.5, ease: EASE },
  },
};

type KpiAnim = {
  duration: number;
  delay: number;
  yKey: number[];
  xKey: number[];
  rotKey: number[];
};

type KpiProps = {
  label: string;
  value: string;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  trendColor?: string;
  className?: string;
  entryDelay?: number;
  anim: KpiAnim;
};

function KpiFloating(props: KpiProps) {
  const { className, entryDelay = 0, anim } = props;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.55, delay: 0.6 + entryDelay, ease: EASE },
      }}
      className={"absolute z-30 " + (className ?? "")}
    >
      <motion.div
        animate={{
          y: anim.yKey,
          x: anim.xKey,
          rotate: anim.rotKey,
        }}
        transition={{
          duration: anim.duration,
          delay: 1.5 + anim.delay,
          repeat: Infinity,
          repeatType: "mirror",
          ease: EASE,
        }}
        className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-[0_12px_32px_rgba(31,50,67,0.15)] backdrop-blur-sm ring-1 ring-black/5"
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${props.iconBg}`}>
          <props.icon className="h-4 w-4 text-[#120b40]" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#47464f]">{props.label}</p>
          <p className="text-base font-extrabold leading-none text-[#120b40]">{props.value}</p>
          {props.trend && (
            <p className={`mt-0.5 text-[10px] font-bold ${props.trendColor ?? "text-emerald-600"}`}>
              {props.trend}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 600], [0, -25]);
  const mockupY = useTransform(scrollY, [0, 600], [0, -55]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#f5f6f8] pb-32 pt-12 lg:pb-40"
    >
      {/* Imagen de fondo a la derecha — fade hacia la izquierda con mask */}
      <motion.div
        aria-hidden
        variants={bgIn}
        initial="hidden"
        animate="show"
        style={{
          y: photoY,
          maskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.85) 38%, black 55%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 18%, rgba(0,0,0,0.85) 38%, black 55%)",
        }}
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[78%] sm:w-[72%] lg:w-[66%]"
      >
        <Image
          src="/landing-v2/images/hero-person.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 72vw, 66vw"
          className="object-cover object-left-bottom"
        />
      </motion.div>

      {/* Avión decorativo arriba */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-16 top-10 z-10 text-[#ea6a30]/40"
        animate={{
          x: [0, 14, 0],
          y: [0, -5, 0],
          rotate: [-10, -6, -10],
        }}
        transition={{ duration: 5.8, repeat: Infinity, ease: EASE }}
      >
        <Plane className="h-8 w-8" />
      </motion.div>

      {/* Contenido principal */}
      <div className="relative z-20 mx-auto grid max-w-6xl items-start gap-6 px-5 pt-4 lg:grid-cols-[1.05fr_1fr]">
        {/* IZQUIERDA: copy + CTAs (sobre el fondo difuminado) */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-30 max-w-xl"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#272255]/15 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#272255] shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-[#ea6a30]" />
              El CRM #1 para Agencias de Viajes
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-[#120b40] sm:text-6xl lg:text-[68px]"
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

          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
          >
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

        {/* DERECHA: zona donde se ven KPIs flotantes + mockup */}
        <div className="relative h-[560px] lg:h-[640px]">
          {/* KPI VENTAS */}
          <KpiFloating
            label="Ventas (mes)"
            value="$47,250"
            trend="+12%"
            icon={TrendingUp}
            iconBg="bg-[#aaf52b]/30"
            className="left-0 top-4 sm:left-2"
            entryDelay={0}
            anim={{
              duration: 4.3,
              delay: 0,
              yKey: [-2, -10, -3, -7, -2],
              xKey: [0, 2, -1, 1, 0],
              rotKey: [0, -1.2, 0.5, -0.6, 0],
            }}
          />

          {/* KPI NUEVOS CLIENTES */}
          <KpiFloating
            label="Nuevos clientes"
            value="36"
            trend="+12%"
            icon={Users}
            iconBg="bg-[#85c2f6]/30"
            className="right-0 top-2 sm:right-4"
            entryDelay={0.12}
            anim={{
              duration: 5.7,
              delay: 0.4,
              yKey: [-1, -8, -2, -6, -1],
              xKey: [0, -2, 1, -1, 0],
              rotKey: [0, 1, -0.4, 0.7, 0],
            }}
          />

          {/* KPI RESERVAS */}
          <KpiFloating
            label="Reservas"
            value="128"
            trend="+10%"
            icon={Plane}
            iconBg="bg-[#272255]/15"
            className="left-2 top-1/2 -translate-y-1/2"
            entryDelay={0.24}
            anim={{
              duration: 5.1,
              delay: 0.9,
              yKey: [-3, -9, -1, -7, -3],
              xKey: [0, 1.5, -1.5, 1, 0],
              rotKey: [0, -0.8, 1, -0.5, 0],
            }}
          />

          {/* KPI TAREAS */}
          <KpiFloating
            label="Tareas pendientes"
            value="14"
            trend="Prioridad alta"
            trendColor="text-[#ea6a30]"
            icon={ClipboardList}
            iconBg="bg-[#ea6a30]/20"
            className="right-2 top-[42%] -translate-y-1/2"
            entryDelay={0.36}
            anim={{
              duration: 4.7,
              delay: 1.3,
              yKey: [-2, -7, -3, -8, -2],
              xKey: [0, -1, 1.5, -0.5, 0],
              rotKey: [0, 0.6, -1, 0.4, 0],
            }}
          />

          {/* Mockup centrado abajo */}
          <motion.div
            variants={mockupIn}
            initial="hidden"
            animate="show"
            style={{ y: mockupY }}
            className="absolute inset-x-0 bottom-4 z-20 mx-auto w-[110%] -translate-x-[5%]"
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

          {/* KPI INGRESOS — esquina inf. derecha, sobre el mockup */}
          <KpiFloating
            label="Ingresos (mes)"
            value="$98,540"
            trend="+22%"
            icon={DollarSign}
            iconBg="bg-[#aaf52b]/30"
            className="bottom-2 right-0 z-30 sm:right-4"
            entryDelay={0.48}
            anim={{
              duration: 5.3,
              delay: 1.7,
              yKey: [-1, -6, -2, -8, -1],
              xKey: [0, 1, -2, 0.5, 0],
              rotKey: [0, -0.5, 0.8, -0.3, 0],
            }}
          />
        </div>
      </div>

      {/* Banner IA centrado al pie */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 1.4, ease: EASE } }}
        className="relative z-30 mx-auto mt-8 flex w-fit max-w-2xl items-center gap-3 rounded-2xl border border-[#272255]/15 bg-[#272255] px-5 py-3 text-white shadow-[0_16px_40px_rgba(31,50,67,0.18)]"
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#aaf52b]">
          <Sparkles className="h-4 w-4 text-[#120b40]" />
        </div>
        <p className="text-sm font-semibold">
          <span className="font-bold uppercase tracking-wider text-[#aaf52b]">IA</span>{" "}
          Recomienda el mejor siguiente paso para cada cliente.
        </p>
      </motion.div>
    </section>
  );
}
