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

const photoIn: Variants = {
  hidden: { opacity: 0, scale: 1.05 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.1, delay: 0.1, ease: EASE },
  },
};

const mockupIn: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, delay: 0.5, ease: EASE },
  },
};

/* KPI float — cada card tiene su propio "ritmo" para evitar lo robótico.
   x/y/rotate con valores asimétricos, duración random, delay distinto. */
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
      className={
        "absolute z-20 " + (className ?? "")
      }
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${props.iconBg}`}>
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
  const photoY = useTransform(scrollY, [0, 600], [0, -30]);
  const mockupY = useTransform(scrollY, [0, 600], [0, -50]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-[#f7f9ff] via-[#edf4ff] to-white pb-24 pt-12 lg:pb-32"
    >
      {/* Avión decorativo arriba derecha */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-24 top-12 text-[#ea6a30]/35"
        animate={{
          x: [0, 12, 0],
          y: [0, -4, 0],
          rotate: [-10, -6, -10],
        }}
        transition={{ duration: 5.8, repeat: Infinity, ease: EASE }}
      >
        <Plane className="h-7 w-7" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1fr_1.1fr]">
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
            className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#120b40] sm:text-5xl lg:text-[60px]"
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

        {/* DERECHA: foto persona + mockup pequeño abajo + KPIs flotantes */}
        <div className="relative min-h-[560px]">
          {/* Foto principal (ocupa el área entera del lado derecho) */}
          <motion.div
            variants={photoIn}
            initial="hidden"
            animate="show"
            style={{ y: photoY }}
            className="relative z-0 mx-auto overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(31,50,67,0.18)]"
          >
            <Image
              src="/landing-v2/images/hero-person.png"
              alt="Profesional de turismo usando Turistea CRM"
              width={1488}
              height={1116}
              priority
              className="h-[480px] w-full object-cover sm:h-[520px] lg:h-[560px]"
            />
          </motion.div>

          {/* Mockup laptop+phone — pequeño, esquina inferior izquierda, no tapa la cara */}
          <motion.div
            variants={mockupIn}
            initial="hidden"
            animate="show"
            style={{ y: mockupY }}
            className="absolute -bottom-8 -left-6 z-10 w-[55%] sm:w-[48%]"
          >
            <Image
              src="/landing-v2/images/mockup-laptop-mobile.png"
              alt="Turistea CRM"
              width={1448}
              height={900}
              priority
              className="h-auto w-full drop-shadow-[0_20px_40px_rgba(31,50,67,0.25)]"
            />
          </motion.div>

          {/* KPI: VENTAS — esquina sup. izq. */}
          <KpiFloating
            label="Ventas (mes)"
            value="$47,250"
            trend="+12%"
            icon={TrendingUp}
            iconBg="bg-[#aaf52b]/30"
            className="-left-2 top-4 sm:left-0"
            entryDelay={0}
            anim={{
              duration: 4.3,
              delay: 0,
              yKey: [-2, -10, -3, -7, -2],
              xKey: [0, 2, -1, 1, 0],
              rotKey: [0, -1.2, 0.5, -0.6, 0],
            }}
          />

          {/* KPI: NUEVOS CLIENTES — esquina sup. der. */}
          <KpiFloating
            label="Nuevos clientes"
            value="36"
            trend="+12%"
            icon={Users}
            iconBg="bg-[#85c2f6]/30"
            className="right-2 top-2 sm:right-6"
            entryDelay={0.12}
            anim={{
              duration: 5.7,
              delay: 0.4,
              yKey: [-1, -8, -2, -6, -1],
              xKey: [0, -2, 1, -1, 0],
              rotKey: [0, 1, -0.4, 0.7, 0],
            }}
          />

          {/* KPI: RESERVAS — mid izq. */}
          <KpiFloating
            label="Reservas"
            value="128"
            trend="+10%"
            icon={Plane}
            iconBg="bg-[#272255]/15"
            className="left-4 top-1/2 -translate-y-1/2"
            entryDelay={0.24}
            anim={{
              duration: 5.1,
              delay: 0.9,
              yKey: [-3, -9, -1, -7, -3],
              xKey: [0, 1.5, -1.5, 1, 0],
              rotKey: [0, -0.8, 1, -0.5, 0],
            }}
          />

          {/* KPI: TAREAS — esquina inf. der. */}
          <KpiFloating
            label="Tareas pendientes"
            value="14"
            trend="Prioridad alta"
            trendColor="text-[#ea6a30]"
            icon={ClipboardList}
            iconBg="bg-[#ea6a30]/20"
            className="bottom-12 right-0 sm:right-4"
            entryDelay={0.36}
            anim={{
              duration: 4.7,
              delay: 1.3,
              yKey: [-2, -7, -3, -8, -2],
              xKey: [0, -1, 1.5, -0.5, 0],
              rotKey: [0, 0.6, -1, 0.4, 0],
            }}
          />
        </div>
      </div>

      {/* Banner IA inferior — centrado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 1.4, ease: EASE } }}
        className="relative z-10 mx-auto mt-16 flex w-fit max-w-2xl items-center gap-3 rounded-2xl border border-[#272255]/15 bg-white px-5 py-3 shadow-[0_12px_32px_rgba(31,50,67,0.08)]"
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
