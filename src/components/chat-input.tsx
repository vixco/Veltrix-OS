"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square, Plus, X, FileText, ImageIcon, Mic, Globe, Brain, SlidersHorizontal, Settings } from "lucide-react";
import { useChatStore } from "@/lib/store";
import type { Attachment } from "@/lib/store";
import { cn, readFileAsAttachment, formatBytes } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { usePreferences } from "@/lib/preferences";
import { ModelSelector } from "./model-selector";
import { ModeSelector } from "./mode-selector";
import type { WorkMode } from "@/lib/modes";
import { MODES } from "@/lib/modes";

interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  onStop: () => void;
  mode: WorkMode;
  onModeChange: (mode: WorkMode) => void;
  webSearch?: boolean;
  onToggleWebSearch?: () => void;
}

export function ChatInput({ onSend, onStop, mode, onModeChange, webSearch, onToggleWebSearch }: ChatInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const thinkingMode = usePreferences((s) => s.capabilities?.thinkingMode ?? "auto");
  const thinkingBudget = usePreferences((s) => s.capabilities?.thinkingBudget ?? 4000);
  const temperature = usePreferences((s) => s.capabilities?.temperature ?? 0.7);
  const maxTokens = usePreferences((s) => s.capabilities?.maxTokens ?? 0);
  const setCapabilities = usePreferences((s) => s.setCapabilities);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const baseTextRef = useRef("");
  const SpeechRecognitionClass = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + "px";
    }
  }, [text]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const next = await Promise.all(Array.from(files).map(readFileAsAttachment));
      setAttachments((prev) => [...prev, ...next]);
    } finally {
      setBusy(false);
    }
  }, []);

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments.length ? attachments : undefined);
    setText("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.files?.length) return;
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;
    if (listening) { try { recogRef.current?.stop(); } catch {} return; }
    const r = new SpeechRecognitionClass();
    r.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    r.interimResults = true;
    r.continuous = false;
    baseTextRef.current = text;
    r.onresult = (e: any) => {
      let interim = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += t;
        else interim += t;
      }
      const base = baseTextRef.current + (baseTextRef.current && !baseTextRef.current.endsWith(" ") ? " " : "");
      setText(base + finalChunk + interim);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [listening, SpeechRecognitionClass, text]);

  const placeholder = MODES[mode].placeholder;
  const canSend = text.trim().length > 0 || attachments.length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto w-full max-w-[768px]">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col rounded-[26px] bg-surface border transition-all duration-200",
            dragging
              ? "border-accent ring-2 ring-accent/30 shadow-lg"
              : focused
                ? "border-border-hover shadow-md scale-[1.005]"
                : "border-border shadow-sm hover:shadow-sm"
          )}
        >
          {dragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[26px] bg-accent/5 pointer-events-none">
              <p className="text-[13px] font-medium text-accent">Drop files to attach</p>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-5 pt-4">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="group relative flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 max-w-[220px]"
                >
                  {a.dataUrl ? (
                    <img src={a.dataUrl} alt={a.filename} className="h-7 w-7 rounded object-cover shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-fg shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate max-w-[140px]">{a.filename}</p>
                    <p className="text-[10px] text-muted-fg">{formatBytes(a.size)}</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="ml-0.5 rounded p-0.5 text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={busy ? "Reading fileâ€¦" : placeholder}
            rows={1}
            className="w-full bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-fg resize-none focus:outline-none max-h-[220px]"
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              
              {listening ? (
                <button
                  onClick={toggleListening}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-accent bg-accent/10 hover:bg-accent/15 transition-all duration-150 active:scale-90"
                  title="Stop listening"
                >
                  <Mic className="h-[18px] w-[18px] animate-pulse-soft text-accent" />
                </button>
              ) : (
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90"
                      title="Add content"
                    >
                      <Plus className="h-[18px] w-[18px]" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content align="start" sideOffset={6} className="z-50 w-[180px] rounded-xl border border-border bg-surface shadow-lg p-1.5 animate-slide-up flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          fileRef.current?.click();
                        }}
                        disabled={busy}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors w-full text-left disabled:opacity-50"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span>Attach Files</span>
                      </button>

                      {SpeechRecognitionClass && (
                        <button
                          onClick={toggleListening}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors w-full text-left"
                        >
                          <Mic className="h-4 w-4 shrink-0" />
                          <span>Voice Input</span>
                        </button>
                      )}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Extended thinking directly on the bar */}
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    className={cn(
                      "flex h-8 items-center justify-center rounded-lg px-2 transition-all duration-150 active:scale-90",
                      thinkingMode === "on"
                        ? "text-accent bg-accent/10 border border-accent/20"
                        : thinkingMode === "off"
                          ? "text-muted-fg/60 hover:text-foreground hover:bg-surface-2"
                          : "text-muted-fg hover:text-foreground hover:bg-surface-2"
                    )}
                    title={"Extended thinking: " + thinkingMode}
                  >
                    <Brain className={cn("h-[17px] w-[17px]", thinkingMode === "off" && "opacity-50 line-through")} />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content align="end" sideOffset={6} className="z-50 w-[240px] rounded-xl border border-border bg-surface shadow-lg p-3 animate-slide-up">
                    <p className="text-[11px] font-semibold text-muted-fg mb-2">Extended Thinking</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-3 bg-surface-2 p-0.5 rounded-lg border border-border/50">
                      {(["auto","on","off"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setCapabilities({ thinkingMode: m })}
                          className={cn(
                            "h-7 rounded-md text-[11.5px] font-semibold capitalize transition-all duration-150",
                            thinkingMode === m
                              ? "bg-surface text-foreground shadow-sm ring-1 ring-border/50"
                              : "text-muted-fg hover:text-foreground"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {thinkingMode !== "off" && (
                      <div className="mt-1.5 bg-surface-2/40 p-2 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between text-[11px] text-muted-fg font-medium">
                          <span>Budget (tokens)</span>
                          <span className="text-foreground font-semibold">{thinkingBudget}</span>
                        </div>
                        <input
                          type="range"
                          min={1000}
                          max={12000}
                          step={500}
                          value={thinkingBudget}
                          onChange={(e) => setCapabilities({ thinkingBudget: Number(e.target.value) })}
                          className="w-full accent-[rgb(var(--accent))] mt-1.5"
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-fg/70 mt-2 leading-tight">
                      Controls whether the AI takes extra time to reason before responding.
                    </p>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              {/* Engine Settings (Mode, Model, Parameters) */}
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90"
                    title="Engine & mode settings"
                  >
                    <Settings className="h-[17px] w-[17px]" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 w-[290px] rounded-2xl border border-border bg-surface shadow-2xl p-4 animate-slide-up flex flex-col gap-4 max-h-[85vh] overflow-y-auto scrollbar-thin"
                  >
                    <div>
                      <h3 className="text-[12px] font-bold text-muted-fg/80 uppercase tracking-wider mb-3">Session Controls</h3>
                      
                      <div className="flex flex-col gap-4">
                        {/* Mode Selector Row */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-medium text-foreground/80">Mode</span>
                          <ModeSelector mode={mode} onChange={onModeChange} />
                        </div>

                        {/* Model Selector Row */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-medium text-foreground/80">Model</span>
                          <ModelSelector variant="pill" />
                        </div>

                        {/* Model Parameters Row */}
                        <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
                          <span className="text-[13px] font-medium text-foreground/80 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-fg" />
                            Model Parameters
                          </span>
                          
                          <div className="flex flex-col gap-2.5 mt-1 bg-surface-2/40 p-2 rounded-lg border border-border/30">
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-muted-fg font-medium">
                                <span>Temperature</span>
                                <span className="text-foreground font-semibold">{temperature.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={2}
                                step={0.05}
                                value={temperature}
                                onChange={(e) => setCapabilities({ temperature: Number(e.target.value) })}
                                className="w-full accent-[rgb(var(--accent))] mt-1.5"
                              />
                            </div>

                            <div className="border-t border-border/20 pt-2.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-fg font-medium mb-1.5">
                                <span>Max Output Tokens</span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  max={128000}
                                  step={256}
                                  value={maxTokens}
                                  onChange={(e) => setCapabilities({ maxTokens: Math.max(0, Number(e.target.value) || 0) })}
                                  className="w-full h-8 rounded-lg bg-surface border border-border/80 px-2.5 text-[12px] text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                                  placeholder="auto"
                                />
                                {maxTokens === 0 && (
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-fg/60 select-none pointer-events-none">
                                    auto (default)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              {isStreaming && (
                <button
                  onClick={onStop}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-fg hover:text-foreground hover:bg-surface-2 active:scale-90 transition-all duration-150 animate-pulse-soft"
                  title="Stop"
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "group flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90",
                  canSend
                    ? "bg-foreground text-background hover:scale-110 hover:shadow-lg"
                    : "bg-foreground text-background opacity-25 pointer-events-none"
                )}
                title="Send"
              >
                <ArrowUp className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-fg/50 mt-2 flex items-center justify-center gap-2">
          <span>Veltrix can make mistakes. Check important info.</span>
          <span className="text-muted-fg/40">·</span>
          <span className="flex items-center gap-1">Press <kbd className="border border-border rounded px-1 py-0.5 text-[10px] text-muted-fg/70">Ctrl K</kbd> for commands</span>
        </p>
      </div>
    </div>
  );
}
