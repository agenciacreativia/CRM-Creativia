import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warn" | "danger" | "info";

const styles: Record<Variant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-800",
  warn: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
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
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
