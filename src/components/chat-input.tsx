"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Paperclip } from "lucide-react";
import { useChatStore, useProviderStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ChatInput({ onSend, onStop }: { onSend: (text: string) => void; onStop: () => void }) {
  const [text, setText] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeProvider = useProviderStore((s) => s.activeProvider);
  const activeModel = useProviderStore((s) => s.activeModel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
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
    <div className="px-6 pb-6 pt-2">
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl bg-surface-2 border border-border transition-colors focus-within:border-border-hover",
            "shadow-lg shadow-black/20"
          )}
        >
          <button className="p-2.5 text-muted-fg hover:text-foreground transition-colors" title="Attach file">
            <Paperclip className="h-4.5 w-4.5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent py-3.5 text-[15px] text-foreground placeholder:text-muted-fg resize-none focus:outline-none max-h-[200px]"
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="m-2 h-8 w-8 flex items-center justify-center rounded-lg bg-surface-3 text-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="m-2 h-8 w-8 flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-muted-fg/40 mt-2">
          {activeProvider} · {activeModel}
        </p>
      </div>
    </div>
  );
}