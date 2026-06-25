"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import {
  ArrowRight,
  ClipboardList,
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

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#f0f1f2] pb-32 pt-12 lg:pb-40"
    >
      {/* Imagen como FONDO del hero: ocupa la mitad derecha y se difumina
          hacia la izquierda con un gradient overlay sólido (más confiable
          que mask-image cross-browser). Sin rounded, sin shadow → no parece
          un recuadro, parece pintada en la pared del hero.
          Ancho responsive con max-w para que no crezca infinito en monitores
          grandes (27"+). */}
      <motion.div
        aria-hidden
        variants={bgIn}
        initial="hidden"
        animate="show"
        style={{ y: photoY }}
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[92%] max-w-[820px] sm:w-[72%] lg:w-[60%] xl:w-[52%]"
      >
        <Image
          src="/landing-v2/images/hero-person.png"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 72vw, (max-width: 1280px) 60vw, 820px"
          className="object-cover object-bottom"
        />
        {/* Overlay gradient: cubre el lado izquierdo de la imagen con el mismo
            color del hero, para fundirla con el fondo sin borde visible. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #f0f1f2 0%, #f0f1f2 22%, rgba(240,241,242,0.92) 32%, rgba(240,241,242,0.55) 44%, rgba(240,241,242,0) 60%)",
          }}
        />
        {/* Overlay vertical en el borde superior para fundir con la sticky
            navbar y el borde inferior para fundir con la siguiente sección */}
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, #f0f1f2 0%, rgba(240,241,242,0) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              "linear-gradient(to top, #f0f1f2 0%, rgba(240,241,242,0) 100%)",
          }}
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
            className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-[#120b40] sm:text-6xl lg:text-[64px]"
          >
            El CRM hecho<br />
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
            Más que paneles y reportes, Turistea es tu compañero de ventas,
            que te ayuda a vender más.
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
        </motion.div>

        {/* Reserva la altura del hero en el grid sin renderizar nada — los
            KPIs viven fuera, anclados al área de la foto */}
        <div className="hidden h-[560px] lg:block lg:h-[640px]" aria-hidden />
      </div>

      {/* KPIs anclados al ÁREA DE LA FOTO (mismo width/maxWidth que la imagen)
          para que orbiten siempre alrededor de Tea, sin importar el ancho del
          viewport — y no floten sobre el fondo gris fuera de la persona.
          Sólo se muestran desde lg: en mobile/tablet la foto y el copy ya
          comparten espacio y los KPIs se superponen al texto. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-30 hidden lg:block lg:w-[60%] xl:w-[52%] xl:max-w-[820px]">
        {/* KPI VENTAS — sup-izq de la foto */}
        <KpiFloating
          label="Ventas (mes)"
          value="$47,250"
          trend="+12%"
          icon={TrendingUp}
          iconBg="bg-[#aaf52b]/30"
          className="left-2 top-10 sm:left-6"
          entryDelay={0}
          anim={{
            duration: 4.3,
            delay: 0,
            yKey: [-2, -10, -3, -7, -2],
            xKey: [0, 2, -1, 1, 0],
            rotKey: [0, -1.2, 0.5, -0.6, 0],
          }}
        />

        {/* KPI NUEVOS CLIENTES — sup-der */}
        <KpiFloating
          label="Nuevos clientes"
          value="36"
          trend="+12%"
          icon={Users}
          iconBg="bg-[#85c2f6]/30"
          className="right-4 top-6 sm:right-8"
          entryDelay={0.12}
          anim={{
            duration: 5.7,
            delay: 0.4,
            yKey: [-1, -8, -2, -6, -1],
            xKey: [0, -2, 1, -1, 0],
            rotKey: [0, 1, -0.4, 0.7, 0],
          }}
        />

        {/* KPI RESERVAS — costado izq de la foto, altura del torso */}
        <KpiFloating
          label="Reservas"
          value="128"
          trend="+10%"
          icon={Plane}
          iconBg="bg-[#272255]/15"
          className="left-0 top-[55%] -translate-y-1/2 sm:left-2"
          entryDelay={0.24}
          anim={{
            duration: 5.1,
            delay: 0.9,
            yKey: [-3, -9, -1, -7, -3],
            xKey: [0, 1.5, -1.5, 1, 0],
            rotKey: [0, -0.8, 1, -0.5, 0],
          }}
        />

        {/* KPI TAREAS — inf-der (cerca del laptop de la foto) */}
        <KpiFloating
          label="Tareas pendientes"
          value="14"
          trend="Prioridad alta"
          trendColor="text-[#ea6a30]"
          icon={ClipboardList}
          iconBg="bg-[#ea6a30]/20"
          className="bottom-20 right-2 sm:right-6"
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
    </section>
  );
}
