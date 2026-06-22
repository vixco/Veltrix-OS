"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, MessageSquare, Folder, Brain, Sparkles, Settings, Globe,
  Mic, Brain as BrainIcon, Pin, StopCircle, Download, FileText, CornerDownLeft, ArrowUp, ArrowDown,
} from "lucide-react";
import { useChatStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { exportAllData } from "@/lib/export-data";
import { MODES, type WorkMode } from "@/lib/modes";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: any;
  group: string;
  run: () => void;
  keywords?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: WorkMode;
  onModeChange: (m: WorkMode) => void;
  onOpenSettings: (tab?: string) => void;
}

export function CommandPalette({ open, onClose, mode, onModeChange, onOpenSettings }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const setActive = useChatStore((s) => s.setActive);
  const createConversation = useChatStore((s) => s.createConversation);
  const togglePin = useChatStore((s) => s.togglePin);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const thinkingMode = usePreferences((s) => s.capabilities?.thinkingMode ?? "auto");
  const setCapabilities = usePreferences((s) => s.setCapabilities);

  const close = useCallback(() => { setQuery(""); setIndex(0); onClose(); }, [onClose]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else { setQuery(""); setIndex(0); }
  }, [open]);

  const baseCommands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      { id: "new", label: "New chat", icon: Plus, group: "Actions", run: () => { createConversation(); close(); }, keywords: "start" },
      { id: "stop", label: "Stop generation", icon: StopCircle, group: "Actions", run: () => {
        // Dispatch the same Esc-abort the app already listens for.
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); close();
      }, keywords: "abort" },
      { id: "pin", label: activeId ? "Pin / unpin current chat" : "Pin current chat", icon: Pin, group: "Actions", run: () => { if (activeId) togglePin(activeId); close(); } },
      { id: "export", label: "Export all data", icon: Download, group: "Actions", run: () => { exportAllData(); close(); } },
    ];
    // Modes
    for (const mid of Object.keys(MODES) as WorkMode[]) {
      const M = MODES[mid];
      items.push({
        id: "mode-" + mid, label: "Mode: " + M.label, hint: M.description, icon: MessageSquare, group: "Mode",
        run: () => { onModeChange(mid); close(); }, keywords: mid,
      });
    }
    // Toggles
    items.push({
      id: "think-cycle", label: "Thinking: " + thinkingMode + " (cycle)", icon: BrainIcon, group: "Toggles",
      run: () => { setCapabilities({ thinkingMode: thinkingMode === "auto" ? "on" : thinkingMode === "on" ? "off" : "auto" }); close(); },
      keywords: "reasoning",
    });
    // Navigation
    items.push({ id: "nav-assistants", label: "Open Assistants", icon: Sparkles, group: "Navigate", run: () => { router.push("/assistants"); close(); } });
    items.push({ id: "nav-projects", label: "Open Projects", icon: Folder, group: "Navigate", run: () => { router.push("/projects"); close(); } });
    items.push({ id: "nav-memory", label: "Open Memory", icon: Brain, group: "Navigate", run: () => { router.push("/memory"); close(); } });
    items.push({ id: "nav-files", label: "Open Files", icon: FileText, group: "Navigate", run: () => { router.push("/files"); close(); } });
    items.push({ id: "nav-settings", label: "Open Settings", icon: Settings, group: "Navigate", run: () => { onOpenSettings("general"); close(); } });
    return items;
  }, [activeId, createConversation, togglePin, thinkingMode, setCapabilities, router, onModeChange, onOpenSettings, close]);

  const chatItems: CommandItem[] = useMemo(() => {
    const q = query.toLowerCase();
    return conversations
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => typeof m.content === "string" && m.content.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((c) => ({
        id: "chat-" + c.id, label: c.title || "Untitled", hint: c.pinned ? "Pinned" : undefined, icon: MessageSquare, group: "Chats",
        run: () => { setActive(c.id); close(); }, keywords: c.title,
      }));
  }, [conversations, query, setActive, close]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const cmds = query
      ? baseCommands.filter((c) => (c.label + " " + (c.keywords || "") + " " + (c.hint || "")).toLowerCase().includes(q))
      : baseCommands;
    return [...cmds, ...chatItems];
  }, [baseCommands, chatItems, query]);

  useEffect(() => { setIndex(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); filtered[index]?.run(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, index, close]);

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onClick={close}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[600px] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-slide-up"
      >
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <Search className="h-4 w-4 text-muted-fg shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search chats…"
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-fg focus:outline-none"
          />
          <kbd className="text-[10px] text-muted-fg border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-muted-fg">No matches</div>
          ) : (
            filtered.map((c, i) => {
              const showGroup = c.group !== lastGroup;
              lastGroup = c.group;
              const Icon = c.icon;
              return (
                <div key={c.id}>
                  {showGroup && <div className="px-2.5 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-fg/60">{c.group}</div>}
                  <button
                    data-active={i === index}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => c.run()}
                    className={cn(
                      "w-full flex items-center gap-3 px-2.5 h-10 rounded-lg text-left transition-colors",
                      i === index ? "bg-accent/10 text-foreground" : "text-muted-fg hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", i === index ? "text-accent" : "text-muted-fg")} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-medium truncate">{c.label}</span>
                      {c.hint && <span className="block text-[11px] text-muted-fg/70 truncate">{c.hint}</span>}
                    </span>
                    {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted-fg/60" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-3 px-4 h-9 border-t border-border text-[10.5px] text-muted-fg/70">
          <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" />navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" />select</span>
          <span className="ml-auto">Veltrix command palette</span>
        </div>
      </div>
    </div>
  );
}
