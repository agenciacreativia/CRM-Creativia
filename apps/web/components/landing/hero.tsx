"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Hero del landing. Las imágenes ahora ya incluyen los KPIs flotantes
 * dibujados como parte del PNG/JPG, así que el componente solo necesita:
 *  - copy + CTAs a la izquierda
 *  - imagen como background absolute al lado derecho (desktop) o full
 *    width abajo (mobile/tablet)
 *
 * Imágenes responsive (mismo fondo, distinto recorte por viewport):
 *  - hero-mobile.jpg   941×1672  (vertical, móvil)
 *  - hero-tablet.jpg  1122×1402  (vertical, tablet)
 *  - hero-desktop.jpg 1672×941   (horizontal, lg+)
 *  - hero-wide.jpg    1916×821   (panorámica, 2xl)
 */
const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 600], [0, -25]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#f0f1f2]"
    >
      {/* =========================================================
          MOBILE / TABLET LAYOUT (<lg): copy ARRIBA, foto ABAJO con
          el ancho completo. La imagen ya trae los KPIs integrados.
          ========================================================= */}
      <div className="lg:hidden">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto max-w-2xl px-5 pt-10 text-center sm:pt-12"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#272255]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#272255] shadow-sm">
              <Sparkles className="h-3 w-3 text-[#ea6a30]" />
              El CRM #1 para Agencias de Viajes
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-[#120b40] sm:text-5xl"
          >
            El CRM hecho para agencias de{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">viajes</span>
              <span className="absolute bottom-1 left-0 z-0 h-3.5 w-full bg-[#aaf52b] opacity-70" />
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#47464f]"
          >
            Más que paneles y reportes, Turistea es tu compañero de ventas, que te
            ayuda a vender más.
          </motion.p>

          <motion.div variants={item} className="mt-7 flex flex-col items-stretch gap-3 sm:items-center">
            <motion.div
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: EASE, delay: 1.2 }}
            >
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#aaf52b] px-7 py-4 text-base font-bold text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.45)] transition hover:bg-[#9be022]"
              >
                Empieza gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <a
              href="#producto"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#272255]/20 bg-white px-7 py-4 text-base font-semibold text-[#272255] transition hover:border-[#272255]"
            >
              Ver demo
            </a>
          </motion.div>
        </motion.div>

        {/* Foto mobile: la imagen viene con KPIs dibujados */}
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 1, ease: EASE } }}
          style={{ y: photoY }}
          className="relative mt-6"
        >
          <picture>
            <source media="(min-width: 640px)" srcSet="/landing-v2/images/hero-tablet.jpg" />
            <img
              src="/landing-v2/images/hero-mobile.jpg"
              alt=""
              aria-hidden
              className="block h-auto w-full"
            />
          </picture>
        </motion.div>
      </div>

      {/* =========================================================
          DESKTOP LAYOUT (≥lg): foto como BACKGROUND del section,
          ocupando el lado derecho. Copy a la izquierda.
          ========================================================= */}
      <div className="relative hidden min-h-[640px] lg:block xl:min-h-[760px]">
        {/* Imagen de fondo: absolute al lado derecho del section.
            En ≥1536px sirve la versión panorámica (hero-wide.jpg). */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 1.1, ease: EASE } }}
          style={{ y: photoY }}
          className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[62%] xl:w-[58%] 2xl:w-[55%]"
        >
          <picture>
            <source media="(min-width: 1536px)" srcSet="/landing-v2/images/hero-wide.jpg" />
            <img
              src="/landing-v2/images/hero-desktop.jpg"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-right-bottom"
            />
          </picture>
          {/* Fade gradient para fundir el lado izquierdo de la imagen con
              el bg del section (mismo color). */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #f0f1f2 0%, rgba(240,241,242,0.92) 10%, rgba(240,241,242,0.55) 22%, rgba(240,241,242,0.18) 32%, rgba(240,241,242,0) 42%)",
            }}
          />
        </motion.div>

        {/* COPY izquierda */}
        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-16 lg:pt-20 xl:max-w-[1480px] xl:pt-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-xl"
          >
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#272255]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#272255] shadow-sm">
                <Sparkles className="h-3 w-3 text-[#ea6a30]" />
                El CRM #1 para Agencias de Viajes
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-[#120b40] xl:text-[68px]"
            >
              El CRM hecho<br />
              para agencias<br />
              de{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">viajes</span>
                <span className="absolute bottom-1.5 left-0 z-0 h-4 w-full bg-[#aaf52b] opacity-70" />
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-md text-base leading-relaxed text-[#47464f]"
            >
              Más que paneles y reportes, Turistea es tu compañero de ventas,
              que te ayuda a vender más.
            </motion.p>

            <motion.div variants={item} className="mt-8 flex items-start gap-3">
              <motion.div
                animate={{ scale: [1, 1.035, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: EASE, delay: 1.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[#aaf52b] px-7 py-3.5 text-base font-bold text-[#120b40] shadow-[0_8px_24px_rgba(170,245,43,0.45)] transition hover:bg-[#9be022]"
                >
                  Empieza gratis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <a
                href="#producto"
                className="inline-flex items-center gap-2 rounded-full border border-[#272255]/20 bg-white px-7 py-3.5 text-base font-semibold text-[#272255] transition hover:border-[#272255]"
              >
                Ver demo
              </a>
            </motion.div>
          </motion.div>
          <div className="h-20 xl:h-28" />
        </div>
      </div>
    </section>
  );
}
