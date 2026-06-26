"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Hero slider — 3 slides con autoplay y navegación por flechas.
 * Cada slide es un click directo al login.
 *
 * Imágenes responsive vía <picture> + media queries — el browser elige una
 * sola por viewport y descarga sólo esa:
 *  - mobile-N.png    ( 941×1672 vertical)  <640px
 *  - tablet-N.png   (1122×1402 vertical)  640–1023px
 *  - desktop-N.png  (1672× 941 horizontal) 1024–1535px
 *  - wide-N.png     (1916× 821 panorámica) ≥1536px
 *
 * UX:
 *  - autoplay 5.5s por slide, pausa al hover (desktop) o cuando la tab
 *    pierde el foco
 *  - swipe gestures en touch (drag horizontal)
 *  - flechas (◀ ▶) visibles, dots como indicador del slide actual
 *  - prefers-reduced-motion: sin slide animation y sin autoplay
 *  - cada slide es un Link → /login (CTA principal del landing)
 */

const SLIDES = [1, 2, 3] as const;
const AUTOPLAY_MS = 5500;
const EASE = [0.21, 0.47, 0.32, 0.98] as const;

// Animación de slide: el nuevo entra desde la derecha o izquierda según
// la dirección, el viejo sale al lado opuesto.
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0.6 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0.6 }),
};

export function Hero() {
  const reduce = useReducedMotion();
  const [[index, dir], setIndex] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (delta: number) =>
      setIndex(([i]) => {
        const next = ((i + delta) % SLIDES.length + SLIDES.length) % SLIDES.length;
        return [next, delta];
      }),
    [],
  );
  const goTo = useCallback(
    (target: number) =>
      setIndex(([i]) => [target, target > i ? 1 : target < i ? -1 : 1]),
    [],
  );

  // Autoplay
  useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [go, reduce, paused]);

  // Pausar cuando la tab pierde foco
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Teclado: flechas ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slideNumber = SLIDES[index];

  return (
    <section
      className="relative isolate overflow-hidden bg-[#f0f1f2]"
      aria-label="Carrusel principal — Turistea CRM"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[941/1672] sm:aspect-[1122/1402] lg:aspect-[1672/941] 2xl:aspect-[1916/821]">
        <AnimatePresence initial={false} custom={dir} mode="sync">
          <motion.div
            key={slideNumber}
            className="absolute inset-0 z-10"
            custom={dir}
            variants={reduce ? undefined : variants}
            initial={reduce ? false : "enter"}
            animate={reduce ? undefined : "center"}
            exit={reduce ? undefined : "exit"}
            transition={
              reduce
                ? undefined
                : { duration: 0.7, ease: EASE, opacity: { duration: 0.3 } }
            }
          >
            <Link
              href="/login"
              className="block h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#aaf52b]/60"
              aria-label={`Ir a empezar gratis — diapositiva ${slideNumber} de ${SLIDES.length}`}
              draggable={false}
            >
              <picture>
                <source
                  media="(min-width: 1536px)"
                  srcSet={`/landing-v2/slider/wide-${slideNumber}.png`}
                />
                <source
                  media="(min-width: 1024px)"
                  srcSet={`/landing-v2/slider/desktop-${slideNumber}.png`}
                />
                <source
                  media="(min-width: 640px)"
                  srcSet={`/landing-v2/slider/tablet-${slideNumber}.png`}
                />
                <img
                  src={`/landing-v2/slider/mobile-${slideNumber}.png`}
                  alt={`Diapositiva ${slideNumber} de Turistea CRM`}
                  className="pointer-events-none block h-full w-full select-none object-cover object-center"
                  draggable={false}
                />
              </picture>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Flecha izquierda */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Diapositiva anterior"
          className="group absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/85 p-2 text-[#120b40] shadow-[0_8px_24px_rgba(31,50,67,0.15)] backdrop-blur transition hover:bg-white sm:left-5 sm:p-3"
        >
          <ChevronLeft className="h-5 w-5 transition group-active:-translate-x-0.5 sm:h-6 sm:w-6" />
        </button>

        {/* Flecha derecha */}
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Siguiente diapositiva"
          className="group absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/85 p-2 text-[#120b40] shadow-[0_8px_24px_rgba(31,50,67,0.15)] backdrop-blur transition hover:bg-white sm:right-5 sm:p-3"
        >
          <ChevronRight className="h-5 w-5 transition group-active:translate-x-0.5 sm:h-6 sm:w-6" />
        </button>

        {/* Dots */}
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 sm:bottom-6">
          {SLIDES.map((n, i) => {
            const active = i === index;
            return (
              <button
                key={n}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir a diapositiva ${n}`}
                aria-current={active}
                className={
                  "h-2 rounded-full transition-all duration-300 " +
                  (active
                    ? "w-8 bg-[#120b40]"
                    : "w-2 bg-white/70 hover:bg-white")
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
