"use client";

import { useState, useEffect, useMemo } from "react";
import { useProviderStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, RefreshCw, Loader2, AlertCircle, Search } from "lucide-react";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const providers = useProviderStore((s) => s.providers);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const refreshModels = useProviderStore((s) => s.refreshModels);
  const getModels = useProviderStore((s) => s.getModels);
  const discovered = useProviderStore((s) => s.discoveredModels);
  const connStatus = useProviderStore((s) => s.connectionStatus);
  const connError = useProviderStore((s) => s.connectionError);
  const [selected, setSelected] = useState<ProviderId>("ollama");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [modelQuery, setModelQuery] = useState("");

  const selectedAdapter = PROVIDERS[selected];
  const selectedConfig = providers[selected];
  const models = getModels(selected);
  const status = connStatus[selected];
  const error = connError[selected];

  // Auto-fetch real models whenever a provider tab is opened, if not yet tried.
  useEffect(() => {
    if (!open || !selectedAdapter.fetchModels) return;
    if (discovered[selected] !== undefined) return;
    if (status === "connecting") return;
    refreshModels(selected);
  }, [open, selected, selectedAdapter, discovered, status, refreshModels]);

  // Clear search when switching provider tabs
  useEffect(() => {
    setModelQuery("");
  }, [selected]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q) ?? false)
    );
  }, [models, modelQuery]);

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader
        title="Provider Settings"
        description="Configure AI model providers. Keys are stored locally in your browser."
      />

      <DialogBody className="flex gap-4 min-h-[400px]">
        {/* Provider list */}
        <div className="w-[180px] shrink-0 space-y-1">
          {(Object.keys(PROVIDERS) as ProviderId[]).map((pid) => {
            const adapter = PROVIDERS[pid];
            const config = providers[pid];
            const st = connStatus[pid];
            return (
              <button
                key={pid}
                onClick={() => setSelected(pid)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 active:scale-[0.98] text-left",
                  selected === pid
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-fg hover:text-foreground hover:bg-surface-2"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  st === "error" ? "bg-destructive" : st === "connected" ? "bg-success" : config?.enabled ? "bg-success" : "bg-muted-fg/30"
                )} />
                {adapter.label}
              </button>
            );
          })}
        </div>

        {/* Provider config */}
        <div className="flex-1 space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">{selectedAdapter.label}</h3>
              <p className="text-xs text-muted-fg">
                {selectedAdapter.requiresApiKey ? (selected === "ollama" ? "API key for Ollama Cloud (optional for local)" : "Requires API key") : "No API key needed"}
              </p>
            </div>
            <button
              onClick={() => updateProvider(selected, { enabled: !selectedConfig?.enabled })}
              className={cn(
                "relative h-6 w-10 rounded-full transition-colors",
                selectedConfig?.enabled ? "bg-accent" : "bg-surface-3"
              )}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                selectedConfig?.enabled ? "left-[18px]" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Base URL */}
          {selectedAdapter.defaultBaseUrl !== undefined && (
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1.5 block">Base URL</label>
              <Input
                placeholder={selectedAdapter.defaultBaseUrl || "https://..."}
                value={selectedConfig?.baseUrl || ""}
                onChange={(e) => updateProvider(selected, { baseUrl: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* API key */}
          {selectedAdapter.requiresApiKey && (
            <div>
              <label className="text-xs font-medium text-muted-fg mb-1.5 block">API Key</label>
              <div className="relative">
                <Input
                  type={showKey[selected] ? "text" : "password"}
                  placeholder="sk-..."
                  value={selectedConfig?.apiKey || ""}
                  onChange={(e) => updateProvider(selected, { apiKey: e.target.value })}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  onClick={() => setShowKey((s) => ({ ...s, [selected]: !s[selected] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground transition-transform active:scale-90"
                >
                  {showKey[selected] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Connection test + models */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-fg">Available Models</label>
              {selectedAdapter.fetchModels && (
                <button
                  onClick={() => refreshModels(selected)}
                  disabled={status === "connecting"}
                  className="flex items-center gap-1.5 text-xs text-muted-fg hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  {status === "connecting" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {status === "connecting" ? "Testing…" : "Test connection"}
                </button>
              )}
            </div>

            {status === "error" && (
              <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive leading-snug">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{error || "Connection failed"}</span>
              </div>
            )}

            {status === "connected" && selectedAdapter.fetchModels && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-success/90">
                <Check className="h-3.5 w-3.5" /> Connected — {models.length} model{models.length === 1 ? "" : "s"} found
                {modelQuery && filteredModels.length !== models.length && (
                  <span className="text-muted-fg">({filteredModels.length} match{filteredModels.length === 1 ? "" : "es"})</span>
                )}
              </div>
            )}

            {models.length > 8 && (
              <div className="mb-2 relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-fg/50" />
                <input
                  value={modelQuery}
                  onChange={(e) => setModelQuery(e.target.value)}
                  placeholder="Search models…"
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-2 border border-border text-[13px] text-foreground placeholder:text-muted-fg/50 focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin pr-0.5">
              {models.length === 0 && status !== "error" && (
                <div className="px-3 py-3 rounded-lg bg-surface-2 border border-border text-xs text-muted-fg">
                  {selectedAdapter.fetchModels
                    ? status === "connecting"
                      ? "Connecting to server…"
                      : "No models found. Make sure the server is running and click Test connection."
                    : "No models available."}
                </div>
              )}
              {filteredModels.length === 0 && models.length > 0 && modelQuery && (
                <div className="px-3 py-3 rounded-lg bg-surface-2 border border-border text-xs text-muted-fg">
                  No models match &ldquo;{modelQuery}&rdquo;
                </div>
              )}
              {filteredModels.map((model) => (
                <div key={model.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border">
                  <Check className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                  <span className="text-sm text-foreground">{model.name}</span>
                  {model.description && (
                    <span className="text-[11px] text-muted-fg/70 hidden sm:inline">{model.description}</span>
                  )}
                  <span className="text-xs text-muted-fg ml-auto font-mono truncate max-w-[140px]">{model.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Done</Button>
      </DialogFooter>
    </Dialog>
  );
}
