"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

// Horizon Voyager button system:
//   primary  → navy (global / safe action)
//   success  → lime (Book Now, Save, Approve)
//   urgent   → orange (Create Lead, Emergency)
//   secondary→ white outlined (Cancel, Back)
//   ghost    → text-only
//   danger   → red (destructive)
type Variant = "primary" | "success" | "urgent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:   "bg-brand-navy text-white hover:bg-brand-navy-deep",
  success:   "bg-brand-green text-brand-navy-deep hover:brightness-105",
  urgent:    "bg-brand-orange text-white hover:brightness-110",
  secondary: "bg-white text-gray-800 border border-outline hover:bg-surface-low",
  ghost:     "text-gray-700 hover:bg-surface-low",
  danger:    "bg-status-danger text-white hover:brightness-110",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

/**
 * Button con micro-bounce al click: scale 0.96 mientras se aprieta,
 * vuelve a 1 con spring. Sentís el click sin cambiar el rect (no salta).
 * Respeta prefers-reduced-motion via Motion.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.4 }}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
