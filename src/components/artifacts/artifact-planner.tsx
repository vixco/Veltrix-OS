"use client";

import type { Artifact } from "@/lib/artifacts";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Circle } from "lucide-react";

export function ArtifactPlanner({ artifact }: { artifact: Artifact }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">{artifact.title}</h1>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-1">
          {artifact.plan?.map((item, i) => (
            <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
              <div className={cn(
                "relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                item.done
                  ? "bg-success/20 border border-success/30"
                  : "bg-surface-2 border border-border"
              )}>
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-fg" />
                )}
              </div>
              <div className="flex-1 pt-1.5">
                {item.time && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-fg mb-0.5">
                    <Clock className="h-3 w-3" />
                    {item.time}
                  </div>
                )}
                <h3 className={cn(
                  "text-[15px] font-medium",
                  item.done ? "text-muted-fg line-through" : "text-foreground"
                )}>
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-muted-fg mt-1">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}