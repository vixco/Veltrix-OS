"use client";

import { FileText, GitCompare, Code2, CalendarClock, Palette } from "lucide-react";
import type { ArtifactType } from "@/lib/artifacts";

const typeIcons: Record<ArtifactType, typeof FileText> = {
  document: FileText,
  comparison: GitCompare,
  code: Code2,
  planner: CalendarClock,
  design: Palette,
};

const typeLabels: Record<ArtifactType, string> = {
  document: "Document",
  comparison: "Comparison",
  code: "Code",
  planner: "Planner",
  design: "Design",
};

// Shown while an artifact is still streaming in (its opening tag has
// arrived but the closing tag has not). Instead of dumping the raw,
// half-written content into the chat, we show a calm "creating" state and
// only reveal the finished artifact once it is complete -- keeps the chat tidy.
export function ArtifactCreating({
  type,
  title,
}: {
  type: ArtifactType;
  title: string;
}) {
  const Icon = typeIcons[type] ?? FileText;
  const label = typeLabels[type] ?? "Artifact";

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden animate-slide-up shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-surface-2/40">
        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-fg font-medium">
            {label}
          </div>
          <div className="text-sm font-medium text-foreground truncate">
            {title || "Untitled"}
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-fg shrink-0">
          <span className="spinner-ring text-accent" style={{ width: "0.85em", height: "0.85em" }} />
          Creating
        </span>
      </div>
      <div className="px-4 py-3.5 space-y-2.5">
        <div className="h-2.5 rounded-full bg-surface-2 shimmer-bar" style={{ width: "62%" }} />
        <div className="h-2.5 rounded-full bg-surface-2 shimmer-bar" style={{ width: "88%" }} />
        <div className="h-2.5 rounded-full bg-surface-2 shimmer-bar" style={{ width: "44%" }} />
      </div>
    </div>
  );
}
