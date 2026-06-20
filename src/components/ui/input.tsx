"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-fg transition-colors focus:border-border-hover focus:bg-surface-3 focus:outline-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-fg transition-colors focus:border-border-hover focus:bg-surface-3 focus:outline-none resize-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };