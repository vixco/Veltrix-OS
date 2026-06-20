"use client";

import { useState } from "react";
import { useProviderStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check } from "lucide-react";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const providers = useProviderStore((s) => s.providers);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const [selected, setSelected] = useState<ProviderId>("ollama");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const selectedAdapter = PROVIDERS[selected];
  const selectedConfig = providers[selected];

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
            return (
              <button
                key={pid}
                onClick={() => setSelected(pid)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  selected === pid
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-fg hover:text-foreground hover:bg-surface-2"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  config?.enabled ? "bg-success" : "bg-muted-fg/30"
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
                {selectedAdapter.requiresApiKey ? "Requires API key" : "No API key needed"}
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground"
                >
                  {showKey[selected] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Available models */}
          <div>
            <label className="text-xs font-medium text-muted-fg mb-2 block">Available Models</label>
            <div className="space-y-1.5">
              {selectedAdapter.models.map((model) => (
                <div key={model.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border">
                  <Check className="h-3.5 w-3.5 text-muted-fg" />
                  <span className="text-sm text-foreground">{model.name}</span>
                  <span className="text-xs text-muted-fg ml-auto font-mono">{model.id}</span>
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