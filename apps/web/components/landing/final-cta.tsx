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
    <section className="relative overflow-hidden bg-gradient-to-br from-[#120b40] via-[#1a1357] to-[#272255] py-20 text-white">
      {/* Gradient sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 rotate-[-20deg]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(170,245,43,0.08) 35%, rgba(170,245,43,0.18) 50%, rgba(170,245,43,0.08) 65%, transparent 100%)",
        }}
        animate={{ x: ["0%", "260%"] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: EASE, repeatDelay: 1.5 }}
      />

      {/* Avión que cruza la sección */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-10 top-12 text-[#aaf52b]/35"
        initial={{ x: -100, y: 20, rotate: -10 }}
        whileInView={{
          x: 60,
          y: -10,
          rotate: -5,
          transition: { duration: 4, ease: EASE, repeat: Infinity, repeatType: "reverse" },
        }}
        viewport={{ once: false }}
      >
        <Plane className="h-10 w-10" />
      </motion.div>

      {/* Avión decorativo derecha */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-12 bottom-10 text-[#85c2f6]/30"
        animate={{
          y: [0, -8, 0],
          rotate: [12, 16, 12],
          transition: { duration: 6, repeat: Infinity, ease: EASE },
        }}
      >
        <Plane className="h-8 w-8" />
      </motion.div>

      <motion.div
        variants={content}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative mx-auto max-w-4xl px-5 text-center"
      >
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Impulsa tu agencia<br />al próximo destino
        </h2>
        <p className="mt-4 text-white/75 md:text-lg">
          Con Turistea, vender más es más simple.
        </p>

        <motion.div
          className="mt-8 inline-block"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: EASE, delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-8 py-4 text-base font-bold text-[#120b40] shadow-[0_12px_32px_rgba(170,245,43,0.45)] transition hover:bg-[#9be022]"
          >
            Empieza gratis ahora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
