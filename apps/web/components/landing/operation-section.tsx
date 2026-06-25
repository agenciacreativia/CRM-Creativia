"use client";

import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { CheckCircle2 } from "lucide-react";

const OPERATION_BULLETS = [
  "Pipeline por etapas con alertas",
  "KPIs de ventas y cotizaciones",
  "Top destinos y productos",
  "Actividades y tareas del equipo",
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const textColumn: Variants = {
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

const screenshot: Variants = {
  hidden: { opacity: 0, x: 32, scale: 0.98 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, delay: 0.2, ease: EASE },
  },
};

export function OperationSection() {
  return (
    <section className="bg-[#f7f9ff] py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1fr_1.3fr]">
        <motion.div
          variants={textColumn}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-[#120b40] md:text-[40px] md:leading-tight">
            Tu operación bajo control, en tiempo real
          </h2>
          <p className="mt-4 text-base text-[#47464f]">
            Visualizá tu pipeline, ventas y objetivos en un dashboard diseñado para
            agencias de viajes.
          </p>
          <motion.ul
            variants={bulletsContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-6 space-y-3"
          >
            {OPERATION_BULLETS.map((b) => (
              <motion.li
                key={b}
                variants={bullet}
                className="flex items-center gap-2.5 text-sm text-[#081d2d]"
              >
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#aaf52b]" />
                <span>{b}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          variants={screenshot}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_24px_64px_rgba(31,50,67,0.12)]"
        >
          <Image
            src="/landing/images/screenshot-kanban-desktop.png"
            alt="Dashboard de Turistea CRM"
            width={1912}
            height={908}
            className="h-auto w-full"
          />
        </motion.div>
      </div>
    </section>
  );
}
