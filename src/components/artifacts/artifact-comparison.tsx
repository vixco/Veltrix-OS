"use client";

import type { Artifact } from "@/lib/artifacts";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function ArtifactComparison({ artifact }: { artifact: Artifact }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">{artifact.title}</h1>

      <div className="grid grid-cols-1 gap-4">
        {artifact.items?.map((item, i) => (
          <div
            key={i}
            className="rounded-xl bg-surface-2 border border-border p-5 hover:border-border-hover transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-fg mt-1">{item.description}</p>
                )}
              </div>
              {item.score !== undefined && (
                <div className="flex flex-col items-end">
                  <div className={cn(
                    "text-2xl font-bold",
                    item.score >= 8 ? "text-success" : item.score >= 6 ? "text-warning" : "text-destructive"
                  )}>
                    {item.score}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-fg">/ 10</div>
                </div>
              )}
            </div>

            {item.score !== undefined && (
              <div className="mb-4 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.score >= 8 ? "bg-success" : item.score >= 6 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${item.score * 10}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-success mb-2">Pros</h4>
                <ul className="space-y-1.5">
                  {item.pros.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive mb-2">Cons</h4>
                <ul className="space-y-1.5">
                  {item.cons.map((c, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                      <X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}