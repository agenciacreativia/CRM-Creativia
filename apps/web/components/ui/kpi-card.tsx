"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

/**
 * KPI card del dashboard. Wrapper client component que añade:
 *  - fade-in + slide-up en mount con stagger basado en `index`
 *  - micro-lift en hover (en lugar de transition CSS sola)
 *  - respeta prefers-reduced-motion
 */
type Props = {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  /** Posición en la grilla, para el stagger delay (0,1,2,3,…) */
  index?: number;
};

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function KpiCard({ label, value, hint, href, index = 0 }: Props) {
  const reduce = useReducedMotion();

  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight text-gray-900">{value}</p>
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
    </>
  );

  const baseClassName =
    "block rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:border-gray-300 hover:shadow-lift";
  const linkClass = baseClassName + " cursor-pointer";

  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        whileHover: { y: -2 },
        transition: { duration: 0.4, delay: index * 0.07, ease: EASE },
      };

  if (href) {
    return (
      <motion.div {...motionProps}>
        <Link href={href} className={linkClass}>
          {inner}
        </Link>
      </motion.div>
    );
  }
  return (
    <motion.div className={baseClassName} {...motionProps}>
      {inner}
    </motion.div>
  );
}
