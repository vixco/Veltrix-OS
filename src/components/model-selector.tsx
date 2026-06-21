"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Check, SlidersHorizontal, Loader2, RefreshCw, AlertCircle, Search } from "lucide-react";
import { useProviderStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";
import { ModelLogo } from "@/lib/model-logos";

export function ModelSelector({ variant = "pill" }: { variant?: "pill" | "header" }) {
  const activeProvider = useProviderStore((s) => s.activeProvider);
  const activeModel = useProviderStore((s) => s.activeModel);
  const setProvider = useProviderStore((s) => s.setProvider);
  const setModel = useProviderStore((s) => s.setModel);
  const providers = useProviderStore((s) => s.providers);
  const getModels = useProviderStore((s) => s.getModels);
  const refreshModels = useProviderStore((s) => s.refreshModels);
  const discovered = useProviderStore((s) => s.discoveredModels);
  const connStatus = useProviderStore((s) => s.connectionStatus);
  const connError = useProviderStore((s) => s.connectionError);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Partial<Record<ProviderId, boolean>>>({});
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const refreshed = useRef<Partial<Record<ProviderId, boolean>>>({});

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  // Auto-discover models for every enabled provider that supports it, once.
  useEffect(() => {
    (Object.keys(PROVIDERS) as ProviderId[]).forEach((pid) => {
      if (!providers[pid]?.enabled) return;
      if (!PROVIDERS[pid].fetchModels) return;
      if (discovered[pid] !== undefined) return;
      if (refreshed.current[pid]) return;
      refreshed.current[pid] = true;
      refreshModels(pid);
    });
  }, [providers, discovered, refreshModels]);

  const enabledProviders = (Object.keys(PROVIDERS) as ProviderId[]).filter(
    (pid) => providers[pid]?.enabled
  );

  // When searching, auto-expand all providers so matches are visible.
  const effectiveCollapsed = useMemo(() => {
    if (query) return {} as Partial<Record<ProviderId, boolean>>;
    return collapsed;
  }, [collapsed, query]);

  const totalModels = enabledProviders.reduce((n, pid) => n + getModels(pid).length, 0);

  function statusDot(pid: ProviderId) {
    const st = connStatus[pid];
    if (st === "connecting") return <Loader2 className="h-3 w-3 animate-spin text-muted-fg" />;
    if (st === "error") return <AlertCircle className="h-3 w-3 text-destructive" />;
    if (st === "connected") return <span className="h-1.5 w-1.5 rounded-full bg-success" />;
    return <span className="h-1.5 w-1.5 rounded-full bg-muted-fg/30" />;
  }

  // Pre-compute filtered models per provider
  const filteredByProvider = useMemo(() => {
    const map: Record<string, ReturnType<typeof getModels>> = {};
    const q = query.toLowerCase();
    for (const pid of enabledProviders) {
      const all = getModels(pid);
      map[pid] = q
        ? all.filter(
            (m) =>
              m.id.toLowerCase().includes(q) ||
              m.name.toLowerCase().includes(q) ||
              (m.description?.toLowerCase().includes(q) ?? false)
          )
        : all;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledProviders, query, discovered, providers]);

  const currentModels = getModels(activeProvider);
  const currentModel = currentModels.find((m) => m.id === activeModel) || currentModels[0];

  const hasResults = Object.values(filteredByProvider).some((m) => m.length > 0);

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
        <ModelLogo modelId={currentModel?.id || ""} provider={activeProvider} className="h-4 w-4" />
        <span className="font-medium text-foreground/90">{currentModel?.name || "Select model"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-[340px] rounded-xl bg-surface border border-border shadow-2xl z-50 animate-fade-in flex flex-col max-h-[480px]">
          {/* Search bar */}
          {totalModels > 6 && (
            <div className="p-2 border-b border-border shrink-0">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-fg/50" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search modelsâ€¦"
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-2 border border-border text-[13px] text-foreground placeholder:text-muted-fg/50 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Scrollable model list */}
          <div className="overflow-y-auto scrollbar-thin p-1.5 flex-1 min-h-0">
            {enabledProviders.length === 0 && (
              <div className="px-3 py-6 text-center text-[13px] text-muted-fg">
                No providers enabled.
                <br />
                Open settings to configure one.
              </div>
            )}
            {!hasResults && query && (
              <div className="px-3 py-6 text-center text-[13px] text-muted-fg">
                No models match &ldquo;{query}&rdquo;
              </div>
            )}
            {enabledProviders.map((pid) => {
              const adapter = PROVIDERS[pid];
              const models = filteredByProvider[pid] || [];
              const st = connStatus[pid];
              if (query && models.length === 0) return null;
              const isCollapsed = effectiveCollapsed[pid];
              return (
                <div key={pid} className="mb-1 last:mb-0">
                  <div
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-surface-2 cursor-pointer select-none transition-colors"
                    onClick={() => setCollapsed((c) => ({ ...c, [pid]: !c[pid] }))}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-fg/60">
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {statusDot(pid)}
                      {adapter.label}
                      {models.length > 0 && (
                        <span className="text-muted-fg/40 font-normal normal-case tracking-normal">
                          {models.length}
                        </span>
                      )}
                    </div>
                    {adapter.fetchModels && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshModels(pid);
                        }}
                        className="text-muted-fg hover:text-foreground transition-colors"
                        title="Refresh models"
                      >
                        <RefreshCw className={cn("h-3 w-3", st === "connecting" && "animate-spin")} />
                      </button>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
                      {st === "connecting" && models.length === 0 && (
                        <div className="px-2.5 py-2 text-[12px] text-muted-fg">Connectingâ€¦</div>
                      )}
                      {st === "error" && (
                        <div className="px-2.5 py-2 text-[12px] text-destructive/90 leading-snug">
                          {connError[pid] || "Connection failed"}
                        </div>
                      )}
                      {models.map((model) => {
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
                            <ModelLogo modelId={model.id} provider={pid} className="h-5 w-5 shrink-0" />
                            <span className="flex-1 min-w-0">
                              <span className="text-[13.5px] font-medium block truncate">{model.name}</span>
                              {model.description && (
                                <span className="text-[11px] text-muted-fg/60 block truncate">{model.description}</span>
                              )}
                              {model.contextWindow ? (
                                <span className="text-[11px] text-muted-fg/60">
                                  {model.contextWindow > 1000
                                    ? `${Math.round(model.contextWindow / 1000)}K context`
                                    : `${model.contextWindow} context`}
                                </span>
                              ) : null}
                            </span>
                            {active && <Check className="h-4 w-4 text-accent shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
