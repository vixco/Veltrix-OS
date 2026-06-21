"use client";

import { X, Download, Maximize2, Minimize2, Share2 } from "lucide-react";
import { useState } from "react";
import { useArtifactStore } from "@/lib/store";
import { cn, downloadText, artifactToDownload } from "@/lib/utils";
import { ClaudeLogo } from "./claude-logo";
import { ArtifactDocument } from "./artifacts/artifact-document";
import { ArtifactComparison } from "./artifacts/artifact-comparison";
import { ArtifactCode } from "./artifacts/artifact-code";
import { ArtifactPlanner } from "./artifacts/artifact-planner";
import { ArtifactDesign } from "./artifacts/artifact-design";
import { CoworkPanel } from "./cowork-panel";

export function ArtifactPanel() {
  const panelOpen = useArtifactStore((s) => s.panelOpen);
  const activeArtifactId = useArtifactStore((s) => s.activeArtifactId);
  const artifacts = useArtifactStore((s) => s.artifacts);
  const closePanel = useArtifactStore((s) => s.closePanel);
  const [expanded, setExpanded] = useState(false);
  const [coworkOpen, setCoworkOpen] = useState(false);

  if (!panelOpen || !activeArtifactId) return null;

  const artifact = artifacts[activeArtifactId];
  if (!artifact) return null;

  const handleDownload = () => {
    const { filename, content, mime } = artifactToDownload(artifact);
    downloadText(filename, content, mime);
  };

  return (
    <>
      <div
        className={cn(
          "h-full border-l border-border bg-surface flex flex-col transition-all duration-300 animate-slide-right",
          expanded ? "w-full" : "w-[520px] shrink-0"
        )}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ClaudeLogo className="h-4 w-4 text-accent shrink-0" />
            <span className="text-[13px] font-medium text-foreground truncate">
              {artifact.title}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setCoworkOpen(true)}
              className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
              title="Share & collaborate"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
              title={expanded ? "Minimize" : "Maximize"}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={closePanel}
              className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {artifact.type === "document" && <ArtifactDocument artifact={artifact} />}
          {artifact.type === "comparison" && <ArtifactComparison artifact={artifact} />}
          {artifact.type === "code" && <ArtifactCode artifact={artifact} />}
          {artifact.type === "design" && <ArtifactDesign artifact={artifact} />}
          {artifact.type === "planner" && <ArtifactPlanner artifact={artifact} />}
        </div>
      </div>

      <CoworkPanel open={coworkOpen} onClose={() => setCoworkOpen(false)} artifact={artifact} />
    </>
  );
}
