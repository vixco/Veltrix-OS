"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square, Plus, X, FileText, ImageIcon } from "lucide-react";
import { useChatStore } from "@/lib/store";
import type { Attachment } from "@/lib/store";
import { cn, readFileAsAttachment, formatBytes } from "@/lib/utils";
import { ModelSelector } from "./model-selector";
import { ModeSelector } from "./mode-selector";
import type { WorkMode } from "@/lib/modes";
import { MODES } from "@/lib/modes";

interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  onStop: () => void;
  mode: WorkMode;
  onModeChange: (mode: WorkMode) => void;
}

export function ChatInput({ onSend, onStop, mode, onModeChange }: ChatInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

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
            placeholder={busy ? "Reading file…" : placeholder}
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
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90 disabled:opacity-50"
                title="Add attachment"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
              <ModeSelector mode={mode} onChange={onModeChange} />
              <ModelSelector variant="pill" />
            </div>

            <div className="flex items-center gap-2">
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
        <p className="text-center text-[11px] text-muted-fg/50 mt-2">
          Veltrix can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
