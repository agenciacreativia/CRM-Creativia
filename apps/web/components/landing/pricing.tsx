"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { Check } from "lucide-react";

type Plan = {
  name: string;
  tagline: string;
  badge?: string;
  price: string;
  priceUnit: string;
  priceNote: string;
  cta: string;
  ctaStyle: "outline" | "lime";
  highlight: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Free",
    tagline: "Para empezar a organizarte",
    price: "$0",
    priceUnit: "COP/mes",
    priceNote: "Siempre gratis",
    cta: "Comenzar gratis",
    ctaStyle: "outline",
    highlight: false,
    features: [
      "Hasta 2 usuarios",
      "Hasta 100 contactos",
      "Pipeline básico",
      "Cotizaciones ilimitadas",
      "Soporte por email",
    ],
  },
  {
    name: "Pro",
    tagline: "Para agencias en crecimiento",
    badge: "Más popular",
    price: "$159.000",
    priceUnit: "COP/mes",
    priceNote: "por usuario",
    cta: "Probar gratis 14 días",
    ctaStyle: "lime",
    highlight: true,
    features: [
      "Usuarios ilimitados",
      "Contactos ilimitados",
      "Pipeline avanzado con alertas",
      "Salidas, maestros y comisiones",
      "Dashboards y reportes",
      "Soporte prioritario",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Para agencias consolidadas",
    price: "A medida",
    priceUnit: "",
    priceNote: "Hablemos de tu operación",
    cta: "Contactar ventas",
    ctaStyle: "outline",
    highlight: false,
    features: [
      "Todo lo del plan Pro",
      "Multi-sucursal y roles avanzados",
      "Integraciones y API",
      "Onboarding dedicado",
      "Soporte dedicado",
    ],
  },
];

const titleVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export function Pricing() {
  return (
    <section id="precios" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.h2
          variants={titleVariant}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="text-center text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl"
        >
          Planes simples para agencias que quieren crecer
        </motion.h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-14 grid items-start gap-6 lg:grid-cols-3"
          style={{ perspective: 1200 }}
        >
          {PLANS.map((p) => (
            <motion.div
              key={p.name}
              variants={cardVariant}
              whileHover={{
                y: -10,
                rotateX: 2,
                rotateY: 0,
                scale: 1.01,
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 22,
                mass: 0.6,
              }}
              style={{ transformStyle: "preserve-3d" }}
              className={
                p.highlight
                  ? "relative rounded-3xl bg-[#272255] p-8 text-white shadow-[0_24px_64px_rgba(39,34,85,0.25)] hover:shadow-[0_32px_80px_rgba(39,34,85,0.35)] lg:-mt-4 lg:scale-[1.03]"
                  : "relative rounded-3xl border border-black/8 bg-white p-8 shadow-[0_1px_0_rgba(31,50,67,0.04)] hover:shadow-[0_24px_56px_rgba(31,50,67,0.12)]"
              }
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#aaf52b] px-4 py-1 text-xs font-bold text-[#120b40]">
                  {p.badge}
                </span>
              )}

              <h3 className={`text-xl font-bold ${p.highlight ? "text-white" : "text-[#120b40]"}`}>
                {p.name}
              </h3>
              <p className={`mt-1 text-sm ${p.highlight ? "text-white/70" : "text-[#47464f]"}`}>
                {p.tagline}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold ${p.highlight ? "text-white" : "text-[#120b40]"}`}>
                  {p.price}
                </span>
                {p.priceUnit && (
                  <span className={`text-sm ${p.highlight ? "text-white/70" : "text-[#47464f]"}`}>
                    {p.priceUnit}
                  </span>
                )}
              </div>
              <p className={`mt-1 text-sm ${p.highlight ? "text-white/70" : "text-[#47464f]"}`}>
                {p.priceNote}
              </p>

              <ul className="mt-7 space-y-3">
                {p.features.map((feat) => (
                  <li
                    key={feat}
                    className={`flex gap-2.5 text-sm ${p.highlight ? "text-white/90" : "text-[#47464f]"}`}
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${p.highlight ? "text-[#aaf52b]" : "text-[#446900]"}`}
                      strokeWidth={3}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={
                  "mt-8 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5 " +
                  (p.ctaStyle === "lime"
                    ? "bg-[#aaf52b] text-[#120b40] hover:bg-[#9be022]"
                    : p.highlight
                    ? "border border-white/40 text-white hover:bg-white/10"
                    : "border border-[#272255]/20 text-[#272255] hover:border-[#272255]")
                }
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
