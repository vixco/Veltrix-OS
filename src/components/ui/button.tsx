"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Ripple = { id: number; x: number; y: number; size: number };

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
    size?: "sm" | "md" | "lg" | "icon";
  }
>(({ className, variant = "secondary", size = "md", onClick, children, ...props }, ref) => {
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const rippleId = React.useRef(0);

  const variants = {
    primary:
      "bg-primary text-primary-fg hover:bg-primary/90 shadow-sm hover:shadow-md",
    secondary:
      "bg-surface-2 text-foreground hover:bg-surface-3 border border-border hover:border-border-hover",
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

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Spawn a ripple from the click position
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = rippleId.current++;
    setRipples((r) => [...r, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== id));
    }, 600);
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center font-medium select-none",
        "transition-[transform,background-color,color,border-color,box-shadow] duration-150",
        "hover:-translate-y-px active:scale-[0.97] active:translate-y-0",
        "disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-current opacity-25"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            transform: "scale(0)",
            animation: "ripple-expand 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />
      ))}
    </button>
  );
});
Button.displayName = "Button";

export { Button };
