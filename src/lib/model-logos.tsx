"use client";

import * as React from "react";
import { cn } from "./utils";

// =================================================================
// Model logos — brand detection from model id / provider, rendered as
// inline SVG (no network fetch, no gradient placeholders). Falls back to
// a clean letter-mark for unknown models so every model still gets a badge.
// =================================================================

type LogoKind =
  | "openai"
  | "anthropic"
  | "gemini"
  | "llama"
  | "mistral"
  | "qwen"
  | "glm"
  | "deepseek"
  | "grok"
  | "cohere"
  | "command"
  | "perplexity"
  | "ollama"
  | "lmstudio"
  | "openrouter"
  | "phi"
  | "gemma"
  | "nvidia"
  | "letter";

export function detectBrand(modelId: string, provider: string): LogoKind {
  const m = (modelId || "").toLowerCase();
  const p = (provider || "").toLowerCase();
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("o4") || m.includes("openai") || p === "openai") return "openai";
  if (m.includes("claude") || m.includes("anthropic") || p === "anthropic") return "anthropic";
  if (m.includes("gemini") || m.includes("gemma")) return m.includes("gemma") ? "gemma" : "gemini";
  if (m.includes("llama") || m.includes("meta-llama")) return "llama";
  if (m.includes("mistral") || m.includes("mixtral") || m.includes("codestral") || m.includes("magistral") || m.includes("pixtral")) return "mistral";
  if (m.includes("qwen") || m.includes("alibaba")) return "qwen";
  if (m.includes("glm") || m.includes("zhipu") || m.includes("chatglm")) return "glm";
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("grok")) return "grok";
  if (m.includes("command-r") || m.includes("command-a")) return "command";
  if (m.includes("cohere")) return "cohere";
  if (m.includes("sonar") || m.includes("perplexity") || m.includes("pplx")) return "perplexity";
  if (m.includes("phi")) return "phi";
  if (m.includes("nemotron")) return "nvidia";
  if (p === "ollama" && !m.includes("llama") && !m.includes("qwen") && !m.includes("gemma") && !m.includes("phi") && !m.includes("glm") && !m.includes("mistral") && !m.includes("deepseek")) return "ollama";
  if (p === "lmstudio") return "lmstudio";
  if (p === "openrouter" && !m.includes("llama") && !m.includes("claude") && !m.includes("gpt") && !m.includes("gemini") && !m.includes("mistral")) return "openrouter";
  return "letter";
}

function LetterMark({ letter, className }: { letter: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("text-muted-fg", className)} fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="rgb(var(--surface-3))" />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="600" fill="rgb(var(--fg))">{letter}</text>
    </svg>
  );
}

export function ModelLogo({
  modelId,
  provider,
  className,
}: {
  modelId: string;
  provider: string;
  className?: string;
}) {
  const kind = detectBrand(modelId, provider);
  const letter = (modelId || "?").replace(/[^a-zA-Z0-9]/g, "").charAt(0).toUpperCase() || "?";

  switch (kind) {
    case "openai":
      return (
        <svg viewBox="0 0 24 24" className={cn("text-foreground", className)} fill="currentColor" aria-hidden>
          <path d="M22.28 9.82a5.96 5.96 0 0 0-.52-4.91 6.04 6.04 0 0 0-6.5-2.9A6.04 6.04 0 0 0 4.99 4.07a5.96 5.96 0 0 0-3.99 2.9 6.04 6.04 0 0 0 .74 7.05 5.96 5.96 0 0 0 .52 4.91 6.04 6.04 0 0 0 6.5 2.9 5.96 5.96 0 0 0 4.5 2.01 6.04 6.04 0 0 0 5.77-4.18 5.96 5.96 0 0 0 3.99-2.9 6.04 6.04 0 0 0-.74-7.05ZM13.26 20.5a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.78.78 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.06v5.58a4.5 4.5 0 0 1-4.49 4.49ZM4.4 16.98a4.48 4.48 0 0 1-.53-3.02l.14.08 4.79 2.77a.78.78 0 0 0 .78 0l5.85-3.37v2.33a.07.07 0 0 1-.04.07L10.6 18.6a4.5 4.5 0 0 1-6.2-1.62ZM3.06 7.93a4.48 4.48 0 0 1 2.36-1.99v5.69a.78.78 0 0 0 .39.68l5.84 3.37-2.03 1.17a.07.07 0 0 1-.07 0L4.78 14.08a4.5 4.5 0 0 1-1.72-6.15Zm15.62 3.63L12.84 8.2l2.02-1.17a.07.07 0 0 1 .07 0l4.78 2.76a4.5 4.5 0 0 1-.68 8.13v-5.69a.78.78 0 0 0-.4-.67Zm2.01-3.03-.14-.09-4.78-2.78a.78.78 0 0 0-.79 0L9.14 9.04V6.71a.07.07 0 0 1 .04-.07l4.78-2.76a4.5 4.5 0 0 1 6.68 4.66ZM8.07 12.93l-2.03-1.17a.07.07 0 0 1-.04-.06V6.28a4.5 4.5 0 0 1 7.38-3.47l-.14.08-4.78 2.76a.78.78 0 0 0-.39.68v6.6Zm1.1-2.37 2.6-1.5 2.61 1.5v3l-2.6 1.5-2.61-1.5Z" />
        </svg>
      );
    case "anthropic":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#d97757" />
          <path fill="#fff" d="M13.4 6h2.1L19 18h-2l-.74-2.3h-3.7L11.8 18h-2L13.4 6Zm.2 3.2-1.3 4.2h2.6l-1.3-4.2Z" />
          <path fill="#fff" d="M7.2 6h2v12h-2z" opacity="0" />
        </svg>
      );
    case "gemini":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <defs>
            <linearGradient id="gmx" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4285F4" />
              <stop offset="0.5" stopColor="#9B72CB" />
              <stop offset="1" stopColor="#D96570" />
            </linearGradient>
          </defs>
          <path fill="url(#gmx)" d="M12 2c.4 4.3 2.9 7.5 7.2 8.1v1.8c-4.3.6-6.8 3.8-7.2 8.1-.4-4.3-2.9-7.5-7.2-8.1v-1.8C9.1 9.5 11.6 6.3 12 2Z" />
        </svg>
      );
    case "gemma":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#1a73e8" />
          <path fill="#fff" d="M12 6.5 17 12l-5 5.5-5-5.5 5-5.5Z" opacity="0.95" />
        </svg>
      );
    case "llama":
      return (
        <svg viewBox="0 0 24 24" className={cn("text-foreground", className)} fill="currentColor" aria-hidden>
          <path d="M7 4c1.1 0 2 .9 2 2v3l1.2.6c.5.3.8.8.8 1.4V17a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1.5a1 1 0 0 1 .6-.9L7 14.2V6a2 2 0 0 1 0-2Zm10 0a2 2 0 0 1 0 4v4.2l1.4.7a1 1 0 0 1 .6.9V17a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-6c0-.6.3-1.1.8-1.4L15 9V6a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "mistral":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="3" y="4" width="4" height="4" fill="#f7d046" />
          <rect x="3" y="8" width="4" height="4" fill="#f2a73d" />
          <rect x="3" y="12" width="4" height="4" fill="#ee792f" />
          <rect x="3" y="16" width="4" height="4" fill="#ea3326" />
          <rect x="10" y="4" width="4" height="4" fill="#000" />
          <rect x="10" y="12" width="4" height="4" fill="#000" />
          <rect x="17" y="4" width="4" height="4" fill="#f7d046" />
          <rect x="17" y="8" width="4" height="4" fill="#f2a73d" />
          <rect x="17" y="12" width="4" height="4" fill="#ee792f" />
          <rect x="17" y="16" width="4" height="4" fill="#ea3326" />
        </svg>
      );
    case "qwen":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#615ced" />
          <path fill="#fff" d="M7 7h2.2l2.8 7 2.8-7H17v10h-1.7V9.6L12.6 17h-1.2L8.7 9.6V17H7V7Z" />
        </svg>
      );
    case "glm":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#0a6cff" />
          <path fill="#fff" d="M12 6.5c2.5 0 4.5 1.9 4.5 4.3 0 1.6-.9 3-2.2 3.7l1 1.8h-2l-.7-1.3c-.2 0-.4 0-.6 0-2.5 0-4.5-1.9-4.5-4.3S9.5 6.5 12 6.5Zm0 1.7c-1.5 0-2.7 1.1-2.7 2.6S10.5 13.4 12 13.4s2.7-1.1 2.7-2.6S13.5 8.2 12 8.2Z" />
        </svg>
      );
    case "deepseek":
      return (
        <svg viewBox="0 0 24 24" className={cn("text-foreground", className)} fill="currentColor" aria-hidden>
          <path d="M12 4c1.8 2 3 4.5 3 7.3 0 1.2-.2 2.3-.6 3.3 1 .3 2 .9 2.7 1.7a8 8 0 0 0-1-9.3A7.9 7.9 0 0 0 12 4Zm-1.5.2A7.9 7.9 0 0 0 6 9.5c1.2.2 2.3.7 3.2 1.5a8 8 0 0 1 1.3-6.8ZM5 11.5a8 8 0 0 0 4.8 7.3c-.4-1-.6-2.1-.6-3.3 0-1.6.4-3 1.1-4.3a6.5 6.5 0 0 0-5.3.3Zm9.2 4.6c-1 .7-2.2 1.2-3.5 1.4.9.9 2 1.5 3.3 1.8a8 8 0 0 0 4.2-3.2 6.5 6.5 0 0 0-4 0Z" />
        </svg>
      );
    case "grok":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#000" />
          <path fill="#fff" d="M6 6h2.2l6.6 8.6V6H17v12h-2.2L8.2 9.4V18H6V6Z" />
        </svg>
      );
    case "command":
    case "cohere":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#39594d" />
          <path fill="#fff" d="M8 7h5a4 4 0 0 1 0 8H8V7Zm2.2 2v4H13a2 2 0 0 0 0-4h-2.8Z" />
        </svg>
      );
    case "perplexity":
      return (
        <svg viewBox="0 0 24 24" className={cn("text-foreground", className)} fill="currentColor" aria-hidden>
          <path d="M12 3 5 9v9h2v-5l2.5 2.3V18h5v-2.7L17.5 13v5h2V9l-7-6Zm-2.5 6.4L12 9l2.5.4V12l-2.5 2.3L9.5 12V9.4Z" />
        </svg>
      );
    case "ollama":
      return (
        <svg viewBox="0 0 24 24" className={cn("text-foreground", className)} fill="currentColor" aria-hidden>
          <path d="M12 3c-3 0-5 2.4-5 5.5 0 1.4.4 2.6 1 3.5-1.3.7-2 1.9-2 3.3 0 2.4 2.2 4.2 5 4.2h2c2.8 0 5-1.8 5-4.2 0-1.4-.7-2.6-2-3.3.6-.9 1-2.1 1-3.5C17 5.4 15 3 12 3Zm-1.4 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm2.8 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
        </svg>
      );
    case "lmstudio":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#5b6cff" />
          <path fill="#fff" d="M6 7h2v8h5v2H6V7Zm9 0h2.4l1.6 3 1.6-3H23l-2.8 4.6L23 17h-2.4l-1.8-3.2L17 17h-2.4l2.8-4.6L14.9 7Z" />
        </svg>
      );
    case "openrouter":
      return (
        <svg viewBox="0 0 24 24" className={cn("text-foreground", className)} fill="currentColor" aria-hidden>
          <path d="M3 6h6v2.5H6.5v7H9V18H3v-2.5h2.5v-7H3V6Zm9 0h9v2.5h-3v7H21V18h-9v-2.5h3v-7h-3V6Z" />
        </svg>
      );
    case "phi":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#0078d4" />
          <path fill="#fff" d="M9 6h6v2h-2v8h2v2H9v-2h2V8H9V6Z" />
        </svg>
      );
    case "nvidia":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#76b900" />
          <path fill="#fff" d="M9.5 8.5c1.6-1 3.5-.7 4.5.3-1.3.4-2.3 1.4-2.8 2.7 1-.3 2-.2 2.8.2-2 .2-3.6 1.7-4.2 3.6-.6-2.2-.2-4.7 1.4-6.5-1 .2-2 .6-2.8 1.2L9.5 8.5Z" />
        </svg>
      );
    default:
      return <LetterMark letter={letter} className={className} />;
  }
}
