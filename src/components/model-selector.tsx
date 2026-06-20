"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import { useProviderStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";

export function ModelSelector({ variant = "pill" }: { variant?: "pill" | "header" }) {
  const activeProvider = useProviderStore((s) => s.activeProvider);
  const activeModel = useProviderStore((s) => s.activeModel);
  const setProvider = useProviderStore((s) => s.setProvider);
  const setModel = useProviderStore((s) => s.setModel);
  const providers = useProviderStore((s) => s.providers);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const currentProvider = PROVIDERS[activeProvider];
  const currentModel =
    currentProvider.models.find((m) => m.id === activeModel) || currentProvider.models[0];

  const enabledProviders = (Object.keys(PROVIDERS) as ProviderId[]).filter(
    (pid) => providers[pid]?.enabled
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg transition-colors text-muted-fg hover:text-foreground",
          variant === "pill"
            ? "h-8 px-2.5 text-[13px] hover:bg-surface-2"
            : "h-9 px-3 text-sm hover:bg-surface-2"
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground/90">{currentModel?.name || "Select model"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute bottom-full mb-2 left-0 w-[320px] max-h-[420px] overflow-y-auto rounded-xl bg-surface border border-border shadow-2xl p-1.5 z-50 animate-fade-in",
            variant === "pill" && "bottom-full mb-2"
          )}
        >
          {enabledProviders.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-muted-fg">
              No providers enabled.
              <br />
              Open settings to configure one.
            </div>
          )}
          {enabledProviders.map((pid) => {
            const adapter = PROVIDERS[pid];
            return (
              <div key={pid} className="mb-1 last:mb-0">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-fg/60">
                  {adapter.label}
                </div>
                {adapter.models.map((model) => {
                  const active = activeProvider === pid && activeModel === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        setProvider(pid);
                        setModel(model.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                        active
                          ? "bg-surface-3 text-foreground"
                          : "text-muted-fg hover:text-foreground hover:bg-surface-2"
                      )}
                    >
                      <span className="flex-1">
                        <span className="text-[13.5px] font-medium block">{model.name}</span>
                        {model.contextWindow && (
                          <span className="text-[11px] text-muted-fg/60">
                            {model.contextWindow > 1000
                              ? `${model.contextWindow / 1000}K context`
                              : `${model.contextWindow} context`}
                          </span>
                        )}
                      </span>
                      {active && <Check className="h-4 w-4 text-accent" />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
