"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const [show, setShow] = React.useState(false);
  const sideClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={cn(
          "absolute z-50 px-2 py-1 text-xs font-medium rounded-md bg-surface-3 border border-border text-foreground whitespace-nowrap pointer-events-none animate-fade-in",
          sideClass[side]
        )}>
          {content}
        </div>
      )}
    </div>
  );
}

export function DropdownMenu({
  trigger,
  children,
  align = "start",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[200px] rounded-xl bg-surface-2 border border-border shadow-xl p-1.5 animate-fade-in",
            align === "end" ? "right-0" : "left-0"
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-muted-fg hover:text-foreground hover:bg-surface-3 cursor-pointer transition-colors",
        active && "text-foreground bg-surface-3",
        className
      )}
    >
      {children}
    </div>
  );
}