"use client";

import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { Brain, LineChart, ShieldCheck, Sparkles } from "lucide-react";

const BULLETS = [
  {
    icon: LineChart,
    title: "Diseñado para agencias de viajes",
    text: "de todos los tamaños.",
  },
  {
    icon: Brain,
    title: "Usa la IA de Turistea",
    text: "para vender más y mejor.",
  },
  {
    icon: Sparkles,
    title: "Toma decisiones basadas",
    text: "en datos reales.",
  },
  {
    icon: ShieldCheck,
    title: "Tu información siempre",
    text: "segura y respaldada.",
  },
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const textCol: Variants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

const bulletsContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};

const bullet: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

const mockup: Variants = {
  hidden: { opacity: 0, x: 32, scale: 0.97 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.75, delay: 0.15, ease: EASE },
  },
};

export function OperationSection() {
  return (
    <section className="bg-[#f7f9ff] py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1.3fr_1fr]">
        {/* IZQUIERDA: mockup laptop + phone */}
        <motion.div
          variants={mockup}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="relative"
        >
          <Image
            src="/landing-v2/images/mockup-laptop-mobile.png"
            alt="Turistea CRM en laptop y mobile"
            width={1448}
            height={900}
            className="h-auto w-full drop-shadow-[0_24px_48px_rgba(31,50,67,0.15)]"
          />
        </motion.div>

        {/* DERECHA: texto + bullets */}
        <motion.div
          variants={textCol}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-[#120b40] md:text-[40px] md:leading-tight">
            Visual, simple<br />y poderoso
          </h2>

          <motion.ul
            variants={bulletsContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="mt-6 space-y-5"
          >
            {BULLETS.map((b) => (
              <motion.li key={b.title} variants={bullet} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#272255]/8 text-[#272255]">
                  <b.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <p className="text-sm text-[#47464f]">
                  <strong className="font-bold text-[#120b40]">{b.title}</strong> {b.text}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}
