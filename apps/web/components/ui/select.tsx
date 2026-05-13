import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent",
      "disabled:cursor-not-allowed disabled:bg-gray-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
