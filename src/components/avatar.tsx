"use client";

import * as React from "react";
import type { AvatarConfig } from "@/lib/preferences";

// =================================================================
// Avatar — locally generated, deterministic from a seed. No custom photo
// uploads, no network fetch. Five geometric styles.
// =================================================================

function hashSeed(seed: string): number[] {
  let h = 2166136261;
  const out: number[] = [];
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
    if (i % 2 === 1) out.push((h >>> 0) % 1000);
  }
  while (out.length < 16) out.push(Math.floor(Math.random() * 1000));
  return out;
}

export function Avatar({
  config,
  className,
}: {
  config: AvatarConfig;
  className?: string;
}) {
  const r = hashSeed(config.seed || "veltrix");
  const fg = config.fg;
  const bg = config.bg;

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill={bg} />
      {config.style === "bottts" && (
        <g fill={fg}>
          <rect x="12" y="10" width="16" height="14" rx="4" />
          <circle cx="16" cy="17" r="2.2" fill={bg} />
          <circle cx="24" cy="17" r="2.2" fill={bg} />
          <rect x="17" y="24" width="6" height="3" rx="1.5" />
          <rect x="10" y="8" width="4" height="6" rx="2" />
          <rect x="26" y="8" width="4" height="6" rx="2" />
        </g>
      )}
      {config.style === "shapes" && (
        <g fill={fg}>
          <circle cx="20" cy="20" r="9" opacity="0.95" />
          <rect x="6" y="6" width="9" height="9" rx="3" opacity="0.7" transform={`rotate(${r[0] % 90} 10 10)`} />
          <polygon points="30,28 36,36 24,36" opacity="0.8" />
        </g>
      )}
      {config.style === "rings" && (
        <g fill="none" stroke={fg} strokeWidth="3">
          <circle cx="20" cy="20" r="13" opacity="0.4" />
          <circle cx="20" cy="20" r="9" opacity="0.7" />
          <circle cx="20" cy="20" r="5" />
        </g>
      )}
      {config.style === "identicon" && (
        <g fill={fg}>
          {Array.from({ length: 25 }).map((_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const on = (r[i % r.length] + i * 7) % 3 === 0;
            if (!on) return null;
            const mirror = col < 3 ? col : 4 - col;
            return <rect key={i} x={6 + mirror * 5} y={6 + row * 5} width="5" height="5" />;
          })}
        </g>
      )}
      {config.style === "blocks" && (
        <g fill={fg}>
          <rect x="8" y="8" width="10" height="10" rx="3" opacity={0.6 + (r[0] % 4) * 0.1} />
          <rect x="22" y="8" width="10" height="10" rx="3" opacity={0.6 + (r[1] % 4) * 0.1} />
          <rect x="8" y="22" width="10" height="10" rx="3" opacity={0.6 + (r[2] % 4) * 0.1} />
          <rect x="22" y="22" width="10" height="10" rx="3" opacity={0.6 + (r[3] % 4) * 0.1} />
        </g>
      )}
    </svg>
  );
}
