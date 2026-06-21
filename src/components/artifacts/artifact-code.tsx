"use client";

import { useState } from "react";
import type { Artifact } from "@/lib/artifacts";
import { cn } from "@/lib/utils";
import { Code2, Eye, Copy, Check, Play } from "lucide-react";
import { ClaudeCode } from "../claude-code";

export function ArtifactCode({ artifact }: { artifact: Artifact }) {
  const [view, setView] = useState<"code" | "preview" | "run">("code");
  const [copied, setCopied] = useState(false);

  const lang = (artifact.language || "").toLowerCase();
  const isHTML =
    lang === "html" ||
    artifact.code?.startsWith("<!DOCTYPE") ||
    artifact.code?.startsWith("<html");
  // JS/TS run natively in the sandbox; Python runs via Pyodide (loaded on demand).
  const isRunnable =
    lang === "javascript" || lang === "js" ||
    lang === "typescript" || lang === "ts" ||
    lang === "python" || lang === "py";

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("code")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              view === "code" ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>
          {isHTML && (
            <button
              onClick={() => setView("preview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === "preview" ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          )}
          {isRunnable && (
            <button
              onClick={() => setView("run")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === "run" ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground"
              )}
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
          )}
        </div>
        {view !== "run" && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === "code" && (
          <pre className="p-4 text-sm font-mono text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
            {artifact.code}
          </pre>
        )}
        {view === "preview" && isHTML && (
          <iframe
            srcDoc={artifact.code}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts"
            title={artifact.title}
          />
        )}
        {view === "run" && isRunnable && (
          <ClaudeCode
            initialCode={artifact.code || ""}
            language={
              lang === "typescript" || lang === "ts" ? "typescript"
              : lang === "python" || lang === "py" ? "python"
              : "javascript"
            }
          />
        )}
      </div>
    </div>
  );
}
