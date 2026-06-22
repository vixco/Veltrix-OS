"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Code2, Palette, Users, ChevronDown, Microscope } from "lucide-react";
import type { WorkMode } from "@/lib/modes";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/utils";

const modeIcons = {
  chat: MessageSquare,
  code: Code2,
  design: Palette,
  cowork: Users,
  research: Microscope,
};

interface ModeSelectorProps {
  mode: WorkMode;
  onChange: (mode: WorkMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const CurrentIcon = modeIcons[mode];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        <CurrentIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground/90">{MODES[mode].label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-[280px] rounded-xl bg-surface border border-border shadow-2xl p-1.5 z-50 dropdown-in">
          {(Object.keys(MODES) as WorkMode[]).map((mid, idx) => {
            const Icon = modeIcons[mid];
            const m = MODES[mid];
            return (
              <div
                key={mid}
                onClick={() => {
                  onChange(mid);
                  setOpen(false);
                }}
                style={{ ["--i" as any]: idx }}
                className={cn(
                  "flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg cursor-pointer transition-colors animate-stagger-in",
                  mode === mid ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground hover:bg-surface-2"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", mode === mid && "text-accent")} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{m.label}</p>
                  <p className="text-[11px] text-muted-fg/70">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
