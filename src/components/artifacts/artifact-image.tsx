"use client";

import { useState } from "react";
import { Download, AlertTriangle } from "lucide-react";
import type { Artifact } from "@/lib/artifacts";

export function ArtifactImage({ artifact }: { artifact: Artifact }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const url = artifact.imageUrl || "";
  const w = artifact.width || 1024;
  const h = artifact.height || 1024;

  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const safe = (artifact.title || "image").replace(/[^a-z0-9]+/gi, "-").slice(0, 50) || "image";
      a.download = safe + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="p-4">
      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-surface-2/40 flex items-center justify-center"
           style={{ aspectRatio: `${w} / ${h}`, maxHeight: 560 }}>
        {!loaded && !errored && (
          <div className="flex flex-col items-center gap-2 text-muted-fg">
            <div className="h-7 w-7 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            <p className="text-[12px]">Generating image…</p>
          </div>
        )}
        {errored ? (
          <div className="flex flex-col items-center gap-2 text-muted-fg py-10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-[12px]">Image failed to load.</p>
            <a href={url} target="_blank" rel="noreferrer" className="text-[12px] text-accent underline">
              Open URL
            </a>
          </div>
        ) : (
          url && (
            <img
              src={url}
              alt={artifact.prompt || artifact.title}
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
              className="h-full w-full object-contain"
              style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
            />
          )
        )}
      </div>
      {artifact.prompt && (
        <p className="mt-3 text-[13px] text-muted-fg leading-relaxed">{artifact.prompt}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] text-muted-fg hover:text-foreground rounded-lg border border-border bg-surface-2/60 hover:bg-surface-2 transition-colors"
          title="Download image"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
        <span className="text-[11px] text-muted-fg/70">{w} × {h}</span>
      </div>
    </div>
  );
}
