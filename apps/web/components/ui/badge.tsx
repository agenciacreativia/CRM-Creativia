import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warn" | "danger" | "info";

// Horizon Voyager: pill-shaped status badges with 10% opacity backgrounds and
// full-saturation text for high contrast (per the design spec).
const styles: Record<Variant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-[rgba(170,245,43,0.18)] text-[#446900]",
  warn:    "bg-[rgba(234,106,48,0.16)] text-brand-orange",
  danger:  "bg-[rgba(186,26,26,0.12)] text-status-danger",
  info:    "bg-[rgba(133,194,246,0.20)] text-brand-navy",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
