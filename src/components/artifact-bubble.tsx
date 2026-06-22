"use client";

import { FileText, GitCompare, Code2, CalendarClock, ChevronRight, Palette, ImageIcon } from "lucide-react";
import type { Artifact } from "@/lib/artifacts";
import { cn } from "@/lib/utils";

const typeIcons = {
  document: FileText,
  comparison: GitCompare,
  code: Code2,
  planner: CalendarClock,
  design: Palette,
  image: ImageIcon,
};

const typeLabels = {
  document: "Document",
  comparison: "Comparison",
  code: "Code",
  planner: "Planner",
  design: "Design",
  image: "Image",
};

export function ArtifactBubble({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: () => void;
}) {
  const Icon = typeIcons[artifact.type];

  let preview = "";
  if (artifact.type === "document" && artifact.sections?.length) {
    preview = artifact.sections[0].heading || artifact.sections[0].body.slice(0, 100) || "";
  } else if (artifact.type === "comparison" && artifact.items?.length) {
    preview = `${artifact.items.length} items: ${artifact.items.map((i) => i.name).join(", ")}`;
  } else if (artifact.type === "code") {
    preview = artifact.code?.slice(0, 80) || "";
  } else if (artifact.type === "planner" && artifact.plan?.length) {
    preview = `${artifact.plan.length} steps`;
  } else if (artifact.type === "design") {
    preview = artifact.code?.slice(0, 80) || "";
  }

  return (
    <button
      onClick={onOpen}
      className="group relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface hover:border-border-hover hover:bg-surface-2 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 animate-slide-up text-left"
    >
      <div className="relative p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-fg font-medium">
              {typeLabels[artifact.type]}
            </div>
            <div className="text-sm font-medium text-foreground truncate">{artifact.title}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-fg group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
        {preview && <p className="text-xs text-muted-fg line-clamp-2 font-mono">{preview}</p>}
      </div>
    </button>
  );
}
