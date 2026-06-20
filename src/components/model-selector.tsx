"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useProviderStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";

export function ModelSelector() {
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
  const currentModel = currentProvider.models.find((m) => m.id === activeModel) || currentProvider.models[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="font-medium text-foreground">{currentModel?.name || "Select model"}</span>
        <span className="text-xs text-muted-fg/60">·</span>
        <span className="text-xs text-muted-fg/60">{currentProvider.label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[320px] max-h-[400px] overflow-y-auto rounded-xl bg-surface-2 border border-border shadow-2xl p-1.5 z-50 animate-fade-in">
          {(Object.keys(PROVIDERS) as ProviderId[]).map((pid) => {
            const adapter = PROVIDERS[pid];
            const config = providers[pid];
            if (!config?.enabled) return null;
            return (
              <div key={pid} className="mb-1">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-fg/50">
                  {adapter.label}
                </div>
                {adapter.models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => {
                      setProvider(pid);
                      setModel(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                      activeProvider === pid && activeModel === model.id
                        ? "bg-surface-3 text-foreground"
                        : "text-muted-fg hover:text-foreground hover:bg-surface-3/50"
                    )}
                  >
                    <span className="flex-1">
                      <span className="text-sm font-medium block">{model.name}</span>
                      {model.contextWindow && (
                        <span className="text-[11px] text-muted-fg/50">
                          {model.contextWindow > 1000 ? `${model.contextWindow / 1000}K` : model.contextWindow} context
                        </span>
                      )}
                    </span>
                    {activeProvider === pid && activeModel === model.id && (
                      <Check className="h-4 w-4 text-accent" />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}