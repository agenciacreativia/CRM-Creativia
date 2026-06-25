"use client";

import { motion, type Variants } from "motion/react";
import { Quote } from "lucide-react";

/* =========================================================================
   PLACEHOLDER MODE — datos ficticios para revisión visual.
   Para ocultar la sección entera: poner SHOW = false.
   Cuando tengas testimonios reales (frase + autorización + nombre/agencia),
   reemplazá el array TESTIMONIALS y dejá SHOW = true.
   ========================================================================= */
const SHOW = true;

const TESTIMONIALS = [
  {
    initials: "MR",
    name: "Marcela Ruiz",
    role: "Directora General",
    company: "Viajes Café & Mar",
    text: "Turistea transformó por completo la forma en que trabajamos. Vender más y organizarnos nunca fue tan simple.",
    accent: "#aaf52b",
  },
  {
    initials: "NL",
    name: "Nora López García",
    role: "Gerente de Ventas",
    company: "Destinos Mágicos",
    text: "Ahora tenemos todo bajo control, nuestros seguimientos son automáticos y la IA nos ayuda a vender más.",
    accent: "#85c2f6",
  },
  {
    initials: "AT",
    name: "Alejandro Torres",
    role: "Dueño",
    company: "Avantrip Viajes",
    text: "El mejor CRM que hemos usado. Fácil de usar, completo y con un soporte en español increíble.",
    accent: "#ea6a30",
  },
];

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const titleV: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Avatar generado con iniciales sobre fondo de color brand.
    Es honesto: no parece foto stock de persona real. */
function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-[#120b40] ring-2 ring-white shadow-[0_4px_12px_rgba(31,50,67,0.12)]"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function Testimonials() {
  if (!SHOW) return null;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          variants={titleV}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-[#120b40] md:text-4xl">
            Lo que dicen nuestras clientes
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={card}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_4px_16px_rgba(31,50,67,0.06)] hover:shadow-[0_16px_40px_rgba(31,50,67,0.12)]"
            >
              <Quote className="h-7 w-7 text-[#272255]/15" />
              <p className="mt-3 text-sm leading-relaxed text-[#47464f]">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar initials={t.initials} color={t.accent} />
                <div>
                  <p className="text-sm font-bold text-[#120b40]">{t.name}</p>
                  <p className="text-xs text-[#47464f]">{t.role}</p>
                  <p className="text-xs text-[#787680]">{t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Disclaimer discreto — fácil de quitar cuando los testimonios sean reales */}
        <p className="mt-6 text-center text-[10px] uppercase tracking-wider text-[#787680]/60">
          * Testimonios de muestra — pendientes de reemplazar por casos reales
        </p>
      </div>
    </section>
  );
}
