"use client";

import { FileText, GitCompare, Code2, CalendarClock, Palette, Maximize2 } from "lucide-react";
import type { Artifact } from "@/lib/artifacts";
import { ArtifactDocument } from "./artifacts/artifact-document";
import { ArtifactComparison } from "./artifacts/artifact-comparison";
import { ArtifactCode } from "./artifacts/artifact-code";
import { ArtifactPlanner } from "./artifacts/artifact-planner";
import { ArtifactDesign } from "./artifacts/artifact-design";

const typeIcons = {
  document: FileText,
  comparison: GitCompare,
  code: Code2,
  planner: CalendarClock,
  design: Palette,
};

const typeLabels = {
  document: "Document",
  comparison: "Comparison",
  code: "Code",
  planner: "Planner",
  design: "Design",
};

// Renders an artifact's rich UI directly inside the chat stream (like
// Claude.ai), instead of a clickable card that only opens the side panel.
// A small "open in panel" button is kept for anyone who wants the full view.
export function ArtifactInline({
  artifact,
  onOpenPanel,
}: {
  artifact: Artifact;
  onOpenPanel?: () => void;
}) {
  const Icon = typeIcons[artifact.type];
  // Code/design artifacts can be tall; cap them and scroll. Plans, documents
  // and comparisons read best inline without an aggressive height cap.
  const tall = artifact.type === "code" || artifact.type === "design";

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden animate-slide-up shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-surface-2/40">
        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-fg font-medium">
            {typeLabels[artifact.type]}
          </div>
          <div className="text-sm font-medium text-foreground truncate">{artifact.title}</div>
        </div>
        {onOpenPanel && (
          <button
            onClick={onOpenPanel}
            title="Open in panel"
            className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className={tall ? "max-h-[440px] overflow-y-auto" : "overflow-x-auto"}>
        {artifact.type === "document" && <ArtifactDocument artifact={artifact} />}
        {artifact.type === "comparison" && <ArtifactComparison artifact={artifact} />}
        {artifact.type === "code" && <ArtifactCode artifact={artifact} />}
        {artifact.type === "design" && <ArtifactDesign artifact={artifact} />}
        {artifact.type === "planner" && <ArtifactPlanner artifact={artifact} />}
      </div>
    </div>
  );
}
