"use client";

import { motion, type Variants } from "motion/react";
import { ArrowRight, Check, X, TrendingUp } from "lucide-react";

const ANTES = [
  "Información de clientes dispersa",
  "Seguimientos que se te olvidan",
  "Cotizaciones en Excel",
  "Equipos desconectados",
  "Reportes que toman horas",
];

const DESPUES = [
  { strong: "Historial 360°", text: "de cada viajero" },
  { strong: "Recordatorios y seguimientos", text: "automáticos con IA" },
  { strong: "Cotiza, convierte y vende", text: "más" },
  { strong: "Equipos alineados", text: "y productivos" },
  { strong: "Dashboards", text: "en tiempo real" },
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const titleV: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const leftCol: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } },
};

const rightCol: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.15, ease: EASE } },
};

const arrow: Variants = {
  hidden: { opacity: 0, scale: 0.6, rotate: -20 },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.7, delay: 0.4, ease: EASE },
  },
};

const itemsList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function BeforeAfter() {
  return (
    <section id="producto" className="bg-[#f7f9ff] py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          variants={titleV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl">
            Del caos al control
          </h2>
          <p className="mt-3 text-base text-[#47464f]">
            Más que un software: es el cambio que tu agencia necesita.
          </p>
        </motion.div>

        <div className="relative mt-12 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]">
          {/* ANTES */}
          <motion.div
            variants={leftCol}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="rounded-2xl border border-[#ea6a30]/25 bg-[#fff5f0] p-7"
          >
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-[#120b40]">
              <span className="text-2xl">🤯</span>
              ¿Te suena familiar este caos?
            </h3>
            <motion.ul
              variants={itemsList}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-3"
            >
              {ANTES.map((it) => (
                <motion.li
                  key={it}
                  variants={item}
                  className="flex items-center gap-3 text-sm text-[#47464f]"
                >
                  <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ea6a30] text-white">
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{it}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Flecha del medio */}
          <motion.div
            variants={arrow}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            className="hidden items-center justify-center md:flex"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#aaf52b] text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.4)]">
              <ArrowRight className="h-5 w-5" strokeWidth={3} />
            </div>
          </motion.div>

          {/* DESPUÉS */}
          <motion.div
            variants={rightCol}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            className="rounded-2xl border border-[#aaf52b]/40 bg-[#f4fce6] p-7"
          >
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-[#120b40]">
              <span className="text-2xl">✨</span>
              Con Turistea, todo está en un solo lugar
            </h3>
            <motion.ul
              variants={itemsList}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-3"
            >
              {DESPUES.map((it) => (
                <motion.li
                  key={it.strong}
                  variants={item}
                  className="flex items-center gap-3 text-sm text-[#47464f]"
                >
                  <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#446900] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>
                    <strong className="font-bold text-[#120b40]">{it.strong}</strong> {it.text}
                  </span>
                </motion.li>
              ))}
            </motion.ul>

            {/* Pill de conversión */}
            <motion.div
              variants={item}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#446900]/20 bg-white px-3 py-1.5"
            >
              <TrendingUp className="h-4 w-4 text-[#446900]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#47464f]">
                Mejor conversión con seguimientos automáticos
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
