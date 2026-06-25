"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Cuenta animada de 0 (o `from`) hasta `value` cuando el componente
 * entra al viewport. Da feel premium a los KPIs del dashboard sin
 * tocar la lógica de datos.
 *
 * Respeta prefers-reduced-motion: muestra el valor final de inmediato.
 */
type Props = {
  value: number;
  from?: number;
  duration?: number; // segundos
  format?: (n: number) => string;
  className?: string;
};

export function AnimatedNumber({
  value,
  from = 0,
  duration = 1.1,
  format = (n) => Math.round(n).toLocaleString("es"),
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<number>(reduce ? value : from);

  useEffect(() => {
    if (!inView || reduce) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const delta = value - from;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, from, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
