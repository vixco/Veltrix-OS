// Claude-style sunburst mark. Coordinates are precomputed and rounded so that
// server and client render identical markup (avoids hydration mismatches).
const SPOKES = 12;
const R_INNER = 6.6;
const R_OUTER = 14.5;

function buildSpokes() {
  let rects = "";
  for (let i = 0; i < SPOKES; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const x1 = 16 + Math.cos(angle) * R_INNER;
    const y1 = 16 + Math.sin(angle) * R_INNER;
    const x2 = 16 + Math.cos(angle) * R_OUTER;
    const y2 = 16 + Math.sin(angle) * R_OUTER;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.round((cx - 1.1) * 100) / 100;
    const ry = Math.round((cy - 1.1) * 100) / 100;
    rects += `<rect x="${rx}" y="${ry}" width="2.2" height="2.2" rx="0.6" transform="rotate(${i * 30} 16 16)"/>`;
  }
  return rects;
}

const INNER = `<g fill="currentColor">${buildSpokes()}<circle cx="16" cy="16" r="6.4"/></g>`;

export function ClaudeLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: INNER }}
    />
  );
}
