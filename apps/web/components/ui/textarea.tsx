import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
      "placeholder:text-gray-400",
      "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent",
      "disabled:cursor-not-allowed disabled:bg-gray-50",
      "min-h-[80px]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
