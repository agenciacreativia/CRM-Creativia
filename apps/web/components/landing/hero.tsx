"use client";

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
      className="relative isolate overflow-hidden bg-[#f0f1f2]"
    >
      {/* =========================================================
          MOBILE LAYOUT (<lg): copy ARRIBA, foto ABAJO ocupando todo
          el ancho. KPIs Ventas + Reservas en horizontal sobre la foto.
          ========================================================= */}
      <div className="lg:hidden">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto max-w-2xl px-5 pt-10 text-center sm:pt-12"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#272255]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#272255] shadow-sm">
              <Sparkles className="h-3 w-3 text-[#ea6a30]" />
              El CRM #1 para Agencias de Viajes
            </span>
          </motion.div>
          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#120b40] sm:text-5xl"
          >
            El CRM hecho para agencias de{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">viajes</span>
              <span className="absolute bottom-1 left-0 z-0 h-3.5 w-full bg-[#aaf52b] opacity-70" />
            </span>
          </motion.h1>
          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#47464f]"
          >
            Más que paneles y reportes, Turistea es tu compañero de ventas, que te
            ayuda a vender más.
          </motion.p>
          <motion.div variants={item} className="mt-7 flex flex-col items-stretch gap-3 sm:items-center">
            <motion.div
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: EASE, delay: 1.2 }}
            >
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#aaf52b] px-7 py-4 text-base font-bold text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.45)] transition hover:bg-[#9be022]"
              >
                Empieza gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <a
              href="#producto"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#272255]/20 bg-white px-7 py-4 text-base font-semibold text-[#272255] transition hover:border-[#272255]"
            >
              Ver demo
            </a>
          </motion.div>
        </motion.div>

        {/* Foto mobile + KPIs sobre la base */}
        <div className="relative mt-6">
          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 1, ease: EASE } }}
            style={{ y: photoY }}
            className="relative"
          >
            <picture>
              <source media="(min-width: 640px)" srcSet="/landing-v2/images/hero-tablet.png" />
              <img
                src="/landing-v2/images/hero-mobile.png"
                alt=""
                aria-hidden
                className="block h-auto w-full"
              />
            </picture>
          </motion.div>

          {/* KPIs sobre la base de la foto */}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3 px-4 sm:bottom-8">
            <KpiFloating
              label="Ventas (mes)"
              value="$47,250"
              trend="+12%"
              icon={TrendingUp}
              iconBg="bg-[#aaf52b]/30"
              className="relative !static"
              entryDelay={0.3}
              anim={{
                duration: 4.3,
                delay: 0.5,
                yKey: [-2, -8, -3, -6, -2],
                xKey: [0, 1, -1, 0, 0],
                rotKey: [0, -0.8, 0.4, -0.4, 0],
              }}
            />
            <KpiFloating
              label="Reservas"
              value="128"
              trend="+10%"
              icon={Plane}
              iconBg="bg-[#272255]/15"
              className="relative !static"
              entryDelay={0.45}
              anim={{
                duration: 5.1,
                delay: 1,
                yKey: [-2, -7, -3, -8, -2],
                xKey: [0, -1, 1, 0, 0],
                rotKey: [0, 0.5, -0.7, 0.3, 0],
              }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================
          DESKTOP LAYOUT (≥lg): foto como BACKGROUND del section,
          ocupando el lado derecho. Copy a la izquierda, KPIs absolute
          flotando sobre la imagen de fondo.
          ========================================================= */}
      <div className="relative hidden min-h-[640px] lg:block xl:min-h-[760px]">
        {/* Imagen de fondo: absolute al lado derecho del section.
            Sirve hero-wide en ≥1536px, hero-desktop en el resto. */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 1.1, ease: EASE } }}
          style={{ y: photoY }}
          className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[62%] xl:w-[58%] 2xl:w-[55%]"
        >
          {/* Usamos siempre hero-desktop.png (1672x941, ratio 1.78:1). La
              wide (2.33:1) es muy panorámica y al recortarse con object-cover
              queda muy plana. object-right-bottom mantiene a Tea visible
              (está en el centro-derecha de la imagen). */}
          <img
            src="/landing-v2/images/hero-desktop.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-right-bottom"
          />
          {/* Fade gradient hacia la izquierda para fundir la foto con el bg
              del section (mismo color) sin que se vea un corte recto. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #f0f1f2 0%, rgba(240,241,242,0.92) 10%, rgba(240,241,242,0.55) 22%, rgba(240,241,242,0.18) 32%, rgba(240,241,242,0) 42%)",
            }}
          />
        </motion.div>

        {/* COPY izquierda (relative z-10 para quedar sobre la foto) */}
        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-16 lg:pt-20 xl:max-w-[1480px] xl:pt-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-xl"
          >
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#272255]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#272255] shadow-sm">
                <Sparkles className="h-3 w-3 text-[#ea6a30]" />
                El CRM #1 para Agencias de Viajes
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-[#120b40] xl:text-[68px]"
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

            <motion.div variants={item} className="mt-8 flex items-start gap-3">
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
          {/* Padding inferior para que la sección tenga aire */}
          <div className="h-20 xl:h-28" />
        </div>

        {/* KPIs absolute sobre la imagen de fondo (no dentro del grid).
            Comparten el mismo width que el wrap de la imagen para que las
            coordenadas left/right/top/bottom caigan sobre Tea. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[62%] xl:w-[58%] 2xl:w-[55%]">
          <KpiFloating
            label="Ventas (mes)"
            value="$47,250"
            trend="+12%"
            icon={TrendingUp}
            iconBg="bg-[#aaf52b]/30"
            className="left-[6%] top-[12%]"
            entryDelay={0}
            anim={{
              duration: 4.3,
              delay: 0,
              yKey: [-2, -10, -3, -7, -2],
              xKey: [0, 2, -1, 1, 0],
              rotKey: [0, -1.2, 0.5, -0.6, 0],
            }}
          />

          <KpiFloating
            label="Nuevos clientes"
            value="36"
            trend="+12%"
            icon={Users}
            iconBg="bg-[#85c2f6]/30"
            className="right-4 top-[18%] xl:right-10"
            entryDelay={0.12}
            anim={{
              duration: 5.7,
              delay: 0.4,
              yKey: [-1, -8, -2, -6, -1],
              xKey: [0, -2, 1, -1, 0],
              rotKey: [0, 1, -0.4, 0.7, 0],
            }}
          />

          <KpiFloating
            label="Reservas"
            value="128"
            trend="+10%"
            icon={Plane}
            iconBg="bg-[#272255]/15"
            className="left-[8%] top-[55%]"
            entryDelay={0.24}
            anim={{
              duration: 5.1,
              delay: 0.9,
              yKey: [-3, -9, -1, -7, -3],
              xKey: [0, 1.5, -1.5, 1, 0],
              rotKey: [0, -0.8, 1, -0.5, 0],
            }}
          />

          <KpiFloating
            label="Tareas pendientes"
            value="14"
            trend="Prioridad alta"
            trendColor="text-[#ea6a30]"
            icon={ClipboardList}
            iconBg="bg-[#ea6a30]/20"
            className="bottom-[12%] right-4 xl:right-8"
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
    </section>
  );
}
