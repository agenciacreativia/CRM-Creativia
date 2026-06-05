import * as React from "react";
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

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-all",
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
