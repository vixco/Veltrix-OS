"use client";

import type { Artifact } from "@/lib/artifacts";

export function ArtifactDocument({ artifact }: { artifact: Artifact }) {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-1">{artifact.title}</h1>
      <p className="text-sm text-muted-fg mb-8">
        {new Date(artifact.createdAt).toLocaleDateString("en", {
          year: "numeric", month: "long", day: "numeric",
        })}
      </p>

      {artifact.sections?.map((section, i) => (
        <div key={i} className="mb-8 last:mb-0">
          {section.heading && (
            <h2 className="text-xl font-semibold text-foreground mb-3">
              {section.heading}
            </h2>
          )}
          {section.body && (
            <p className="text-[15px] leading-[1.75] text-foreground/80 whitespace-pre-wrap">
              {section.body}
            </p>
          )}
          {section.items && section.items.length > 0 && (
            <ul className="mt-3 space-y-2">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-start gap-3 text-[15px] text-foreground/80">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}