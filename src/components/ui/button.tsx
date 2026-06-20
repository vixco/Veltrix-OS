"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
    size?: "sm" | "md" | "lg" | "icon";
  }
>(({ className, variant = "secondary", size = "md", ...props }, ref) => {
  const variants = {
    primary:
      "bg-primary text-primary-fg hover:bg-primary/90 shadow-sm",
    secondary:
      "bg-surface-2 text-foreground hover:bg-surface-3 border border-border",
    ghost: "text-muted-fg hover:text-foreground hover:bg-surface-2",
    outline:
      "border border-border text-foreground hover:bg-surface-2 hover:border-border-hover",
    destructive:
      "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20",
  };
  const sizes = {
    sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
    md: "h-10 px-4 text-sm rounded-lg gap-2",
    lg: "h-12 px-6 text-base rounded-xl gap-2",
    icon: "h-9 w-9 rounded-lg",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };