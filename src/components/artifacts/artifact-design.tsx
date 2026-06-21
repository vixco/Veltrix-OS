"use client";

import { useState, useEffect, useRef } from "react";
import type { Artifact } from "@/lib/artifacts";
import { cn } from "@/lib/utils";
import { Code2, Eye, Copy, Check, Download, ZoomIn, ZoomOut, Maximize } from "lucide-react";

export function ArtifactDesign({ artifact }: { artifact: Artifact }) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const code = artifact.code || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2 shrink-0">
        <div className="flex items-center gap-1">
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
        </div>
        <div className="flex items-center gap-1">
          {view === "preview" && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] text-muted-fg tabular-nums w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
                title="Reset zoom"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
            title="Download HTML"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-surface">
        {view === "code" ? (
          <pre className="p-4 text-sm font-mono text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
            {code}
          </pre>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{ background: "rgb(var(--surface-3))" }}
          >
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "center",
                width: "100%",
                height: "100%",
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={code}
                className="w-full h-full border-0 bg-white rounded-lg shadow-lg"
                sandbox="allow-scripts"
                title={artifact.title}
                style={{ minHeight: "100%" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
