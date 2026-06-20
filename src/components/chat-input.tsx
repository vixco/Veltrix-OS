"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Plus } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ModelSelector } from "./model-selector";

export function ChatInput({
  onSend,
  onStop,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + "px";
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto w-full max-w-[768px]">
        <div
          className={cn(
            "relative flex flex-col rounded-[26px] bg-surface border border-border transition-shadow",
            "shadow-sm focus-within:border-border-hover focus-within:shadow-md"
          )}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            rows={1}
            className="w-full bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-fg resize-none focus:outline-none max-h-[220px]"
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
                title="Add attachment"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
              <ModelSelector variant="pill" />
            </div>

            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
                title="Stop"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background hover:opacity-80 disabled:opacity-25 disabled:pointer-events-none transition-all active:scale-90"
                title="Send"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-fg/50 mt-2">
          Veltrix can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
