"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, ChevronRight } from "lucide-react";

interface ThinkingBlockProps {
  thinking: string;
  thinkingMs?: number;
  /** True when the answer body is still empty (thinking phase active). */
  contentEmpty: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export function ThinkingBlock({ thinking, thinkingMs, contentEmpty }: ThinkingBlockProps) {
  // Thinking is "live" while we have thinking text, no measured end yet, and the
  // answer body hasn't started streaming.
  const activelyThinking = !!thinking && thinkingMs === undefined && contentEmpty;

  const [expanded, setExpanded] = useState(activelyThinking);
  const prevLive = useRef(activelyThinking);

  // Auto-expand when thinking kicks in, auto-collapse when it wraps up — mirrors
  // the behaviour users expect from a reasoning panel. After that, the user owns
  // the toggle.
  useEffect(() => {
    if (activelyThinking && !prevLive.current) {
      setExpanded(true);
    } else if (!activelyThinking && prevLive.current) {
      setExpanded(false);
    }
    prevLive.current = activelyThinking;
  }, [activelyThinking]);

  if (!thinking) return null;

  const label = activelyThinking
    ? "Thinking"
    : thinkingMs
      ? `Thought for ${formatDuration(thinkingMs)}`
      : "Thought process";

  return (
    <div className="rounded-xl border border-border bg-surface/50 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left press-spring"
      >
        <Brain
          className={`h-3.5 w-3.5 text-accent shrink-0 ${activelyThinking ? "animate-pulse-soft" : ""}`}
        />
        <span className="text-[13px] font-medium text-muted-fg select-none">{label}</span>
        {activelyThinking && (
          <span className="flex items-center gap-1 ml-1">
            <span className="h-1 w-1 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1 w-1 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1 w-1 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        )}
        <ChevronRight
          className={`h-3.5 w-3.5 text-muted-fg ml-auto transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 animate-slide-down">
          <div className="border-l-2 border-accent/30 pl-3">
            <p className="text-[13.5px] leading-relaxed text-muted-fg whitespace-pre-wrap font-sans">
              {thinking}
              {activelyThinking && (
                <span className="inline-block w-[7px] h-[14px] ml-0.5 align-text-bottom bg-accent/70 animate-pulse-soft" />
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
