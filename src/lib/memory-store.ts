"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

// =================================================================
// Memory Node  (an Obsidian-style "note" / brain cell)
// =================================================================

export type MemoryKind = "short" | "long";

export interface MemoryNode {
  id: string;
  /** Owning project, or "global" for cross-project memories. */
  projectId: string;
  /** Short human label, also the graph node title. */
  title: string;
  /** Free-form body. May contain Obsidian-style [[wiki-links]] to other titles. */
  content: string;
  kind: MemoryKind;
  tags: string[];
  /** 0..1 importance/strength. Short-term memories decay; strong ones get promoted. */
  strength: number;
  /** Epoch ms of last access (read or write). Used for recency + decay. */
  lastAccessed: number;
  createdAt: number;
  updatedAt: number;
  /** IDs of the conversations this memory was extracted from (provenance). */
  sourceConvIds: string[];
  /** How many times this memory has been retrieved/reinforced. */
  recallCount: number;
}

export interface MemoryLink {
  id: string;
  from: string; // node id
  to: string;   // node id
  /** Why they are linked, e.g. "wiki", "shared-tag", "co-occurrence". */
  reason: string;
  weight: number;
}

interface MemoryState {
  nodes: MemoryNode[];
  links: MemoryLink[];
  create: (data: Partial<MemoryNode> & { projectId: string; title: string }) => MemoryNode;
  update: (id: string, updates: Partial<MemoryNode>) => void;
  remove: (id: string) => void;
  touch: (id: string) => void;
  /** Batched variant of touch: update many nodes in a single set/persist. */
  touchMany: (ids: string[]) => void;
  link: (from: string, to: string, reason?: string, weight?: number) => void;
  unlink: (linkId: string) => void;
  forProject: (projectId: string) => MemoryNode[];
  forProjectWithGlobal: (projectId: string) => MemoryNode[];
  byId: (id: string) => MemoryNode | undefined;
  /** Promote a strong short-term memory into a long-term one. */
  promote: (id: string) => void;
  /** Apply time-based decay to short-term memories. Returns count removed. */
  decay: (now?: number) => number;
  clearProject: (projectId: string) => void;
  /** Remove provenance for a conversation; deletes memories that came only from it. Returns count removed. */
  forgetConversation: (convId: string) => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      nodes: [],
      links: [],

      create: (data) => {
        const now = Date.now();
        const node: MemoryNode = {
          id: data.id || `mem_${nanoid(10)}`,
          projectId: data.projectId,
          title: data.title,
          content: data.content || "",
          kind: data.kind || "short",
          tags: data.tags || [],
          strength: data.strength ?? (data.kind === "long" ? 0.6 : 0.4),
          lastAccessed: now,
          createdAt: now,
          updatedAt: now,
          sourceConvIds: data.sourceConvIds || [],
          recallCount: 0,
        };
        set((s) => ({ nodes: [node, ...s.nodes] }));
        return node;
      },

      update: (id, updates) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
          ),
        })),

      remove: (id) =>
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          links: s.links.filter((l) => l.from !== id && l.to !== id),
        })),

      touch: (id) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id
              ? { ...n, lastAccessed: Date.now(), recallCount: n.recallCount + 1 }
              : n
          ),
        })),

      touchMany: (ids) => {
        if (!ids.length) return;
        const idSet = new Set(ids);
        const now = Date.now();
        set((s) => ({
          nodes: s.nodes.map((n) =>
            idSet.has(n.id)
              ? { ...n, lastAccessed: now, recallCount: n.recallCount + 1 }
              : n
          ),
        }));
      },

      link: (from, to, reason = "wiki", weight = 1) => {
        if (from === to) return;
        const a = from < to ? from : to;
        const b = from < to ? to : from;
        const existing = get().links.find(
          (l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)
        );
        if (existing) {
          set((s) => ({
            links: s.links.map((l) =>
              l.id === existing.id ? { ...l, weight: l.weight + weight } : l
            ),
          }));
          return;
        }
        set((s) => ({
          links: [...s.links, { id: `lnk_${nanoid(8)}`, from: a, to: b, reason, weight }],
        }));
      },

      unlink: (linkId) =>
        set((s) => ({ links: s.links.filter((l) => l.id !== linkId) })),

      forProject: (projectId) => get().nodes.filter((n) => n.projectId === projectId),

      forProjectWithGlobal: (projectId) =>
        get().nodes.filter((n) => n.projectId === projectId || n.projectId === "global"),

      byId: (id) => get().nodes.find((n) => n.id === id),

      promote: (id) =>
        set((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === id ? { ...n, kind: "long", strength: Math.max(0.6, n.strength) } : n
          ),
        })),

      decay: (now = Date.now()) => {
        const HOUR = 3600_000;
        let removed = 0;
        const surviving = get().nodes.filter((n) => {
          if (n.kind !== "short") return true;
          const age = (now - n.lastAccessed) / HOUR;
          const ttl = 48 * (0.4 + n.strength);
          if (age > ttl) {
            removed++;
            return false;
          }
          return true;
        });
        const ids = new Set(surviving.map((n) => n.id));
        set((s) => ({
          nodes: surviving,
          links: s.links.filter((l) => ids.has(l.from) && ids.has(l.to)),
        }));
        return removed;
      },

      clearProject: (projectId) =>
        set((s) => {
          const ids = new Set(
            s.nodes.filter((n) => n.projectId === projectId).map((n) => n.id)
          );
          return {
            nodes: s.nodes.filter((n) => n.projectId !== projectId),
            links: s.links.filter((l) => !ids.has(l.from) && !ids.has(l.to)),
          };
        }),

      forgetConversation: (convId) =>
        set((s) => {
          const survivors: MemoryNode[] = [];
          for (const n of s.nodes) {
            if (!n.sourceConvIds.includes(convId)) { survivors.push(n); continue; }
            const rest = n.sourceConvIds.filter((id) => id !== convId);
            if (rest.length === 0) continue;
            survivors.push({ ...n, sourceConvIds: rest });
          }
          const ids = new Set(survivors.map((n) => n.id));
          return {
            nodes: survivors,
            links: s.links.filter((l) => ids.has(l.from) && ids.has(l.to)),
          };
        }),
    }),
    {
      name: "veltrix-memory",
      partialize: (s) => ({ nodes: s.nodes, links: s.links }),
    }
  )
);