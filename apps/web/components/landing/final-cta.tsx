"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ArrowRight, Plane } from "lucide-react";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const content: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#120b40] py-16 text-white">
      {/* Gradient sweep: una banda de luz que cruza el fondo cada ~6s.
          Posicionada en absoluto y rotada -20° para que cruce diagonalmente. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 rotate-[-20deg]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(170,245,43,0.08) 35%, rgba(170,245,43,0.18) 50%, rgba(170,245,43,0.08) 65%, transparent 100%)",
        }}
        animate={{
          x: ["0%", "260%"],
        }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: EASE,
          repeatDelay: 1.5,
        }}
      />

      {/* Avión decorativo */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-10 top-8 text-[#aaf52b]/30"
        initial={{ y: 0, rotate: 12 }}
        animate={{
          y: [0, -8, 0],
          rotate: [12, 16, 12],
          transition: { duration: 6.5, repeat: Infinity, ease: EASE },
        }}
      >
        <Plane className="h-7 w-7" />
      </motion.div>

      <motion.div
        variants={content}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative mx-auto max-w-4xl px-5 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Dejá el caos atrás y vendé con más control
        </h2>
        <p className="mt-4 text-white/75">
          Probá Turistea CRM gratis por 14 días. Sin tarjeta de crédito.
        </p>

        {/* CTA con bounce sutil + hover */}
        <motion.div
          className="mt-7 inline-block"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: EASE,
            delay: 0.5,
          }}
          whileHover={{ scale: 1.05 }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-8 py-3.5 text-base font-bold text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.4)] transition hover:bg-[#9be022]"
          >
            Probar gratis 14 días
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <p className="mt-5 text-sm text-white/60">
          Setup rápido · Soporte humano · Cancelá cuando quieras
        </p>
      </motion.div>
    </section>
  );
}
