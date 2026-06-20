"use client";

import {
  FileText,
  GitCompare,
  Code2,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import type { Artifact } from "@/lib/artifacts";
import { cn } from "@/lib/utils";

const typeIcons = {
  document: FileText,
  comparison: GitCompare,
  code: Code2,
  planner: CalendarClock,
};

const typeLabels = {
  document: "Document",
  comparison: "Comparison",
  code: "Code",
  planner: "Planner",
};

const typeGradients = {
  document: "from-violet-500/20 to-violet-500/5",
  comparison: "from-blue-500/20 to-blue-500/5",
  code: "from-emerald-500/20 to-emerald-500/5",
  planner: "from-amber-500/20 to-amber-500/5",
};

export function ArtifactBubble({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: () => void;
}) {
  const Icon = typeIcons[artifact.type];
  const gradient = typeGradients[artifact.type];

  let preview = "";
  if (artifact.type === "document" && artifact.sections?.length) {
    preview = artifact.sections[0].heading || artifact.sections[0].body.slice(0, 100) || "";
  } else if (artifact.type === "comparison" && artifact.items?.length) {
    preview = `${artifact.items.length} items: ${artifact.items.map((i) => i.name).join(", ")}`;
  } else if (artifact.type === "code") {
    preview = artifact.code?.slice(0, 80) || "";
  } else if (artifact.type === "planner" && artifact.plan?.length) {
    preview = `${artifact.plan.length} steps`;
  }

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-2 hover:border-border-hover transition-all text-left",
        "bg-gradient-to-br", gradient
      )}
    >
      <div className="relative p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-8 w-8 rounded-lg bg-surface-3 flex items-center justify-center">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-fg font-medium">
              {typeLabels[artifact.type]}
            </div>
            <div className="text-sm font-medium text-foreground truncate">
              {artifact.title}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-fg group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
        {preview && (
          <p className="text-xs text-muted-fg line-clamp-2 font-mono">
            {preview}
          </p>
        )}
      </div>
    </button>
  );
}