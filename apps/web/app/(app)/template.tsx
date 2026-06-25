"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Page transition de la app autenticada: fade + leve slide al cambiar
 * de ruta. Next.js renderiza template.tsx en cada navegación, así que
 * el efecto corre por cada cambio sin necesidad de AnimatePresence.
 *
 * Mantenido muy sutil (160ms) para no entorpecer el uso del CRM.
 * Respeta prefers-reduced-motion: pasa al instante.
 */
const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
