"use client";

import { motion, type Variants } from "motion/react";
import { Check, X } from "lucide-react";

const ANTES = [
  { title: "Excel disperso", text: "Datos en archivos, versiones y copias." },
  { title: "Leads olvidados", text: "Seguimiento manual y oportunidades perdidas." },
  { title: "No sabés el forecast", text: "Sin visibilidad real de tu embudo." },
  { title: "Seguimiento manual", text: "Tareas, recordatorios y notas en todos lados." },
];

const DESPUES = [
  { title: "Todo centralizado", text: "Clientes, cotizaciones, salidas y comisiones en un lugar." },
  { title: "Recordatorios automáticos", text: "Alertas por tiempo, tareas y próximos hitos." },
  { title: "Dashboard en vivo", text: "Pipeline, ventas y objetivos siempre actualizados." },
  { title: "Seguimiento ordenado", text: "Actividades, notas y comunicaciones en contexto." },
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const titleV: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const leftColumn: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

const rightColumn: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, delay: 0.15, ease: EASE },
  },
};

const itemList: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.25 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function BeforeAfter() {
  return (
    <section id="producto" className="bg-[#f7f9ff] py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.h2
          variants={titleV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="text-center text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl"
        >
          Del caos al control
        </motion.h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* ANTES — entra desde la izquierda */}
          <motion.div
            variants={leftColumn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="rounded-2xl border border-[#ea6a30]/25 bg-[#fff5f0] p-7"
          >
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-[#ea6a30]">
              Antes: así trabajabas
            </h3>
            <motion.ul
              variants={itemList}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              {ANTES.map((it) => (
                <motion.li key={it.title} variants={item} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ea6a30] text-white">
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-bold text-[#120b40]">{it.title}</p>
                    <p className="text-sm text-[#47464f]">{it.text}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* DESPUÉS — entra desde la derecha con leve delay */}
          <motion.div
            variants={rightColumn}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="rounded-2xl border border-[#aaf52b]/40 bg-[#f4fce6] p-7"
          >
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-[#446900]">
              Después: así crecés
            </h3>
            <motion.ul
              variants={itemList}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              {DESPUES.map((it) => (
                <motion.li key={it.title} variants={item} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#446900] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-bold text-[#120b40]">{it.title}</p>
                    <p className="text-sm text-[#47464f]">{it.text}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
