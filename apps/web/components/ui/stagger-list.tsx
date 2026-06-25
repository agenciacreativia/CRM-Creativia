"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * Wrappers genéricos para revelar listas/tablas con un stagger sutil
 * al primer render. Útiles para filas de tabla y cards de kanban donde
 * el feedback "está llegando el contenido" mejora la percepción de
 * velocidad. Respeta prefers-reduced-motion (instant).
 */
const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

export function StaggerList({
  children,
  as = "div",
  className,
}: {
  children: React.ReactNode;
  as?: "div" | "ul" | "tbody";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const MotionComp = motion[as] as typeof motion.div;
  if (reduce) {
    const Tag = as as React.ElementType;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <MotionComp
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </MotionComp>
  );
}

export function StaggerItem({
  children,
  as = "div",
  className,
}: {
  children: React.ReactNode;
  as?: "div" | "li" | "tr";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const MotionComp = motion[as] as typeof motion.div;
  if (reduce) {
    const Tag = as as React.ElementType;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <MotionComp variants={itemVariants} className={className}>
      {children}
    </MotionComp>
  );
}
