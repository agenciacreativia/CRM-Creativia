"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, CheckCircle2, Plane } from "lucide-react";

const TRUST_BADGES = [
  { title: "14 días gratis", sub: "Sin tarjeta de crédito" },
  { title: "Setup rápido", sub: "Onboarding guiado" },
  { title: "Soporte LATAM", sub: "Asistencia humana" },
];

// Container: orquesta el stagger entre hijos.
const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// Cada hijo: fade-in + slide-up suave.
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

// Imagen del mockup: entra desde la derecha con un poco más de delay.
const mockup: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      delay: 0.35,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

// Aviones decorativos: float infinito sutil.
const planeFloat = {
  initial: { y: 0, rotate: -12 },
  animate: {
    y: [0, -10, 0],
    rotate: [-12, -8, -12],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: [0.42, 0, 0.58, 1] as const,
    },
  },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#120b40] text-[#e8f2ff]">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-6 bottom-8 text-[#85c2f6]/30"
        initial={planeFloat.initial}
        animate={planeFloat.animate}
      >
        <Plane className="h-10 w-10" />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-12 top-12 text-[#aaf52b]/40"
        initial={{ y: 0, rotate: 12 }}
        animate={{
          y: [0, 8, 0],
          rotate: [12, 16, 12],
          transition: { duration: 7, repeat: Infinity, ease: [0.42, 0, 0.58, 1] as const, delay: 0.6 },
        }}
      >
        <Plane className="h-6 w-6" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={item}
            className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[56px]"
          >
            El CRM hecho para<br />
            <span className="text-white">agencias de viajes</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-lg text-lg leading-relaxed text-white/80"
          >
            Centralizá clientes, cotizaciones, salidas y comisiones en un solo lugar.
          </motion.p>

          <motion.p
            variants={item}
            className="mt-3 max-w-lg text-base text-white/65"
          >
            Maestros del sector turístico, salidas con hitos, RFM y comisiones.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-7 py-3.5 text-base font-bold text-[#120b40] shadow-[0_4px_16px_rgba(170,245,43,0.45)] transition hover:-translate-y-0.5 hover:bg-[#9be022]"
            >
              Probar gratis 14 días
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#producto"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Ver demo
            </a>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {TRUST_BADGES.map((b) => (
              <div key={b.title} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#aaf52b]" />
                <div>
                  <p className="text-sm font-bold text-white">{b.title}</p>
                  <p className="text-xs text-white/60">{b.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          variants={mockup}
          initial="hidden"
          animate="show"
          className="relative"
        >
          <Image
            src="/landing/images/mockup-laptop-phone.png"
            alt="Turistea CRM en MacBook y iPhone"
            width={1448}
            height={1086}
            priority
            className="h-auto w-full drop-shadow-2xl"
          />
        </motion.div>
      </div>
    </section>
  );
}
