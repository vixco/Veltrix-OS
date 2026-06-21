"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MemoryNode, MemoryLink } from "@/lib/memory-store";

interface Props {
  nodes: MemoryNode[];
  links: MemoryLink[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
  node: MemoryNode;
}

// Force-directed graph renderer. Canvas + a tiny velocity-Verlet simulation,
// Obsidian-graph-view style: dark void, glowing dots, hairline edges.
export function MemoryGraph({ nodes, links, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Map<string, SimNode>>(new Map());
  const viewRef = useRef({ x: 0, y: 0, k: 1 }); // pan/zoom
  const dragRef = useRef<{ type: "node" | "pan" | null; id?: string; lx: number; ly: number }>({
    type: null,
    lx: 0,
    ly: 0,
  });
  const hoverRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 800, h: 600 });
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const colorFor = useCallback((n: MemoryNode, dim = false) => {
    if (n.projectId === "global") return dim ? "rgba(120,160,210,0.25)" : "rgba(150,185,230,0.95)";
    if (n.kind === "long") return dim ? "rgba(198,97,63,0.28)" : "rgba(217,119,87,1)";
    return dim ? "rgba(156,154,146,0.28)" : "rgba(200,198,190,0.95)";
  }, []);

  const rebuild = useCallback(() => {
    const map = simRef.current;
    const next = new Set(nodes.map((n) => n.id));
    // drop removed
    for (const id of [...map.keys()]) if (!next.has(id)) map.delete(id);
    // add new at a ring around center, seeded by index for stability
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    nodes.forEach((n, i) => {
      if (!map.has(n.id)) {
        const ang = (i / Math.max(1, nodes.length)) * Math.PI * 2;
        const r = Math.min(w, h) * 0.28;
        map.set(n.id, {
          id: n.id,
          x: w / 2 + Math.cos(ang) * r + (Math.random() - 0.5) * 40,
          y: h / 2 + Math.sin(ang) * r + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          degree: 0,
          node: n,
        });
      } else {
        map.get(n.id)!.node = n;
      }
    });
    // degree
    for (const sn of map.values()) sn.degree = 0;
    for (const l of links) {
      const a = map.get(l.from);
      const b = map.get(l.to);
      if (a) a.degree += l.weight;
      if (b) b.degree += l.weight;
    }
  }, [nodes, links]);

  const step = useCallback(() => {
    const map = simRef.current;
    const { w, h } = sizeRef.current;
    const arr = [...map.values()];
    if (arr.length === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const k = viewRef.current.k;

    // Repulsion (Coulomb-ish) between all pairs. O(n^2) is fine for brain sizes.
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const d = Math.sqrt(d2);
        const f = 1400 / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }
    // Spring attraction along links
    for (const l of links) {
      const a = map.get(l.from);
      const b = map.get(l.to);
      if (!a || !b) continue;
      const target = 90;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - target) / d) * 0.02 * Math.min(2, l.weight);
      a.vx += dx * f;
      a.vy += dy * f;
      b.vx -= dx * f;
      b.vy -= dy * f;
    }
    // Centering gravity
    for (const sn of arr) {
      sn.vx += (cx - sn.x) * 0.0009;
      sn.vy += (cy - sn.y) * 0.0009;
      // integrate with damping
      sn.vx *= 0.82;
      sn.vy *= 0.82;
      // don't move the dragged node
      if (dragRef.current.type === "node" && dragRef.current.id === sn.id) continue;
      sn.x += sn.vx;
      sn.y += sn.vy;
    }
  }, [links]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // background: deep void with a faint center glow
    ctx.fillStyle = "rgb(20,20,19)";
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    grad.addColorStop(0, "rgba(198,97,63,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const v = viewRef.current;
    ctx.translate(v.x, v.y);
    ctx.scale(v.k, v.k);

    const map = simRef.current;
    const hoverId = hoverRef.current;
    const selId = selectedId || null;
    // neighbor set for highlight
    const focus = hoverId || selId;
    let lit = new Set<string | null>();
    if (focus) {
      lit.add(focus);
      for (const l of links) {
        if (l.from === focus) lit.add(l.to);
        if (l.to === focus) lit.add(l.from);
      }
    }

    // edges
    ctx.lineWidth = 1 / v.k;
    for (const l of links) {
      const a = map.get(l.from);
      const b = map.get(l.to);
      if (!a || !b) continue;
      const dim = focus && !(lit.has(l.from) && lit.has(l.to));
      ctx.strokeStyle = dim
        ? "rgba(90,86,80,0.06)"
        : "rgba(180,120,90,0.5)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // nodes
    for (const sn of map.values()) {
      const r = 3 + Math.min(8, sn.degree * 1.1) + (sn.node.kind === "long" ? 1.5 : 0);
      const dim = !!focus && !lit.has(sn.id);
      ctx.beginPath();
      ctx.arc(sn.x, sn.y, r, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(sn.node, dim);
      ctx.fill();
      if (!dim) {
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = colorFor(sn.node, false).replace(/[\d.]+\)$/, "0.25)");
        ctx.lineWidth = 2 / v.k;
        ctx.stroke();
      }
    }

    // labels: hovered/selected + high-degree long-term nodes
    ctx.font = `${11 / v.k}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const sn of map.values()) {
      const show =
        sn.id === hoverId ||
        sn.id === selId ||
        (sn.node.kind === "long" && sn.degree >= 2 && v.k > 0.8) ||
        v.k > 1.6;
      if (!show) continue;
      const dim = !!focus && !lit.has(sn.id);
      const r = 3 + Math.min(8, sn.degree * 1.1) + (sn.node.kind === "long" ? 1.5 : 0);
      ctx.fillStyle = dim ? "rgba(156,154,146,0.4)" : "rgba(235,233,225,0.92)";
      const label = sn.node.title.slice(0, 34);
      ctx.fillText(label, sn.x, sn.y + r + 3);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [links, selectedId, colorFor]);

  const loop = useCallback(() => {
    step();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [step, draw]);

  // resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // pointer handling
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.k,
      y: (clientY - rect.top - v.y) / v.k,
    };
  }, []);

  const nodeAt = useCallback((wx: number, wy: number) => {
    const map = simRef.current;
    for (const sn of map.values()) {
      const r = 4 + Math.min(8, sn.degree * 1.1) + (sn.node.kind === "long" ? 1.5 : 0) + 4;
      const dx = sn.x - wx;
      const dy = sn.y - wy;
      if (dx * dx + dy * dy <= r * r) return sn.id;
    }
    return null;
  }, []);

  const onDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    const id = nodeAt(x, y);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (id) {
      dragRef.current = { type: "node", id, lx: e.clientX, ly: e.clientY };
      onSelect?.(id);
    } else {
      dragRef.current = { type: "pan", lx: e.clientX, ly: e.clientY };
    }
  }, [toWorld, nodeAt, onSelect]);

  const onMove = useCallback((e: React.PointerEvent) => {
    const v = viewRef.current;
    if (dragRef.current.type === "pan") {
      v.x += e.clientX - dragRef.current.lx;
      v.y += e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
      return;
    }
    if (dragRef.current.type === "node" && dragRef.current.id) {
      const sn = simRef.current.get(dragRef.current.id);
      if (sn) {
        sn.x = (e.clientX - canvasRef.current!.getBoundingClientRect().left - v.x) / v.k;
        sn.y = (e.clientY - canvasRef.current!.getBoundingClientRect().top - v.y) / v.k;
        sn.vx = 0;
        sn.vy = 0;
      }
      return;
    }
    // hover
    const { x, y } = toWorld(e.clientX, e.clientY);
    const id = nodeAt(x, y);
    if (id !== hoverRef.current) {
      hoverRef.current = id;
      setHover(id);
      const c = canvasRef.current;
      if (c) c.style.cursor = id ? "pointer" : "grab";
    }
  }, [toWorld, nodeAt]);

  const onUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = { type: null, lx: 0, ly: 0 };
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const v = viewRef.current;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nk = Math.max(0.35, Math.min(3.5, v.k * factor));
    // zoom toward cursor
    v.x = mx - ((mx - v.x) / v.k) * nk;
    v.y = my - ((my - v.y) / v.k) * nk;
    v.k = nk;
    setZoom(nk);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    const nk = Math.max(0.35, Math.min(3.5, v.k * factor));
    v.x = w / 2 - ((w / 2 - v.x) / v.k) * nk;
    v.y = h / 2 - ((h / 2 - v.y) / v.k) * nk;
    v.k = nk;
    setZoom(nk);
  }, []);

  const resetView = useCallback(() => {
    viewRef.current = { x: 0, y: 0, k: 1 };
    setZoom(1);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "rgb(20,20,19)" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: "grab" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onWheel={onWheel}
      />
      {/* controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          onClick={() => zoomBy(1.25)}
          className="h-8 w-8 rounded-lg bg-black/40 text-[#e9e7e0] hover:bg-black/60 border border-white/10 text-base leading-none"
          title="Zoom in"
        >+</button>
        <button
          onClick={() => zoomBy(1 / 1.25)}
          className="h-8 w-8 rounded-lg bg-black/40 text-[#e9e7e0] hover:bg-black/60 border border-white/10 text-base leading-none"
          title="Zoom out"
        >&#x2212;</button>
        <button
          onClick={resetView}
          className="h-8 w-8 rounded-lg bg-black/40 text-[#e9e7e0] hover:bg-black/60 border border-white/10 text-xs"
          title="Reset view"
        >&#x29c9;</button>
      </div>
      <div className="absolute bottom-2 left-3 text-[11px] text-[#9c9a92]/70 select-none">
        {nodes.length} memories &middot; {links.length} links &middot; {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}