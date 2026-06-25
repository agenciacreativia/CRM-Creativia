"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { ArrowRight, CheckCircle2, Plane } from "lucide-react";

const TRUST_BADGES = [
  { title: "14 días gratis", sub: "Sin tarjeta de crédito" },
  { title: "Setup rápido", sub: "Onboarding guiado" },
  { title: "Soporte LATAM", sub: "Asistencia humana" },
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: EASE,
    },
  },
};

const mockup: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      delay: 0.35,
      ease: EASE,
    },
  },
};

export function Hero() {
  // Parallax: el mockup se mueve un poco más despacio que el resto al scrollear.
  // useScroll devuelve el scrollY global; useTransform lo mapea a translateY.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  // Mientras el usuario scrollea 0 → 600px, el mockup se mueve 0 → -70px (sutil).
  const mockupY = useTransform(scrollY, [0, 600], [0, -70]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#120b40] text-[#e8f2ff]">
      {/* aviones decorativos con float infinito */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-6 bottom-8 text-[#85c2f6]/30"
        initial={{ y: 0, rotate: -12 }}
        animate={{
          y: [0, -10, 0],
          rotate: [-12, -8, -12],
          transition: {
            duration: 6,
            repeat: Infinity,
            ease: EASE,
          },
        }}
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
          transition: {
            duration: 7,
            repeat: Infinity,
            ease: EASE,
            delay: 0.6,
          },
        }}
      >
        <Plane className="h-6 w-6" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <motion.div variants={container} initial="hidden" animate="show">
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
            {/* CTA principal con bounce loop sutil — el botón "latido" invita al click */}
            <motion.div
              animate={{
                scale: [1, 1.035, 1],
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: EASE,
                delay: 1.2, // espera a que termine la animación inicial del hero
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-7 py-3.5 text-base font-bold text-[#120b40] shadow-[0_4px_16px_rgba(170,245,43,0.45)] transition hover:bg-[#9be022]"
              >
                Probar gratis 14 días
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
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

        {/* Mockup: combina la entrada inicial (variants) con parallax (style.y) */}
        <motion.div
          variants={mockup}
          initial="hidden"
          animate="show"
          style={{ y: mockupY }}
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
