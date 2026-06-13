import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warn" | "danger" | "info";

// Horizon Voyager: pill-shaped status badges con fondos de baja opacidad y
// texto de alta saturación. En dark mode el texto usa una variante más clara
// (el color base es muy oscuro y se perdía sobre el fondo tintado oscuro).
const styles: Record<Variant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-[rgba(170,245,43,0.18)] text-[#446900] dark:text-brand-green",
  warn:    "bg-[rgba(234,106,48,0.16)] text-brand-orange dark:text-brand-orange-soft",
  danger:  "bg-[rgba(186,26,26,0.12)] text-status-danger dark:text-[#ffb4ab]",
  info:    "bg-[rgba(133,194,246,0.20)] text-brand-navy dark:text-brand-sky",
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
