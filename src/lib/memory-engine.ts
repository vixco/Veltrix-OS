// =================================================================
// Memory Engine
// Heuristic extraction + token-budgeted retrieval + consolidation.
// No LLM calls by default -> keeps token usage low. Quality > quantity.
// =================================================================

import { useMemoryStore, type MemoryNode } from "./memory-store";

/** Rough token estimate (~4 chars/token). Good enough for budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

const STOP = new Set([
  "the","a","an","and","or","but","if","then","else","for","to","of","in","on","at","by",
  "is","are","was","were","be","been","being","am","i","you","he","she","it","we","they",
  "this","that","these","those","do","does","did","doing","have","has","had","having",
  "will","would","shall","should","can","could","may","might","must","just","so","as",
  "with","about","into","from","up","down","out","over","under","again","further","once",
  "not","no","nor","than","too","very","s","t","d","ll","m","re","ve","y","my","your",
  "his","her","its","our","their","what","which","who","whom","whose","when","where","why",
  "how","all","any","both","each","few","more","most","other","some","such","only","own",
  "same","here","there","also","get","got","want","need","like","okay","ok","yeah","yes",
  "nope","um","uh","actually","really","quite","thing","things","stuff","one","two","etc",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'-]+/g) || []).filter(
    (w) => w.length > 2 && !STOP.has(w)
  );
}

function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

/** Extract [[wiki-link]] targets from text (Obsidian-style). */
export function wikiTargets(text: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1].trim());
  return out;
}

// =================================================================
// Heuristic extraction
// Pulls "memorable" facts out of a single user/assistant exchange.
// Cheap + deterministic: no tokens spent on the model.
// =================================================================

export interface ExtractedMemory {
  title: string;
  content: string;
  tags: string[];
  strength: number;
  wikiLinks: string[];
}

const PREF_PATTERNS: RegExp[] = [
  /\b(?:i (?:prefer|like|love|hate|dislike|enjoy|usually|always|never|tend to|want|need))\b/gi,
  /\b(?:my (?:favorite|fav|preferred|go-to))\b/gi,
  /\b(?:i'm (?:a|an)\b[^.]*?\b(?:developer|designer|founder|student|researcher|engineer|writer|artist|manager))/gi,
];

const FACT_CUES = [
  "remember that", "remember:", "note:", "for the record", "fyi",
  "i am", "i'm", "my name is", "i work", "i use", "i'm using",
  "we are building", "we're building", "the goal is", "the plan is",
  "i decided", "let's go with", "i chose",
];

/**
 * Extract candidate memories from a user->assistant exchange.
 * Keeps it to a handful of high-signal candidates; the caller decides
 * whether to persist (and the store dedupes on title).
 */
export function extractMemories(userText: string, assistantText: string): ExtractedMemory[] {
  const out: ExtractedMemory[] = [];
  const u = userText.trim();
  if (!u) return out;

  const lower = u.toLowerCase();

  // 1) Explicit preference / identity statements from the user.
  for (const re of PREF_PATTERNS) {
    const matches = u.match(re);
    if (!matches) continue;
    // Capture the containing sentence(s).
    for (const hit of matches) {
      const idx = lower.indexOf(hit.toLowerCase());
      const sentence = surroundingSentence(u, idx);
      const title = sentence.replace(/\s+/g, " ").slice(0, 80);
      if (title.length > 8) {
        out.push({
          title,
          content: sentence,
          tags: tokenize(sentence).slice(0, 6),
          strength: 0.7,
          wikiLinks: wikiTargets(sentence),
        });
      }
    }
  }

  // 2) Fact-cued statements.
  for (const cue of FACT_CUES) {
    let i = 0;
    while ((i = lower.indexOf(cue, i)) !== -1) {
      const sentence = surroundingSentence(u, i);
      i += cue.length;
      const title = sentence.replace(/\s+/g, " ").slice(0, 80);
      if (title.length > 12 && !out.some((m) => m.title === title)) {
        out.push({
          title,
          content: sentence,
          tags: tokenize(sentence).slice(0, 6),
          strength: 0.6,
          wikiLinks: wikiTargets(sentence),
        });
      }
      if (out.length >= 8) break;
    }
    if (out.length >= 8) break;
  }

  // 3) A lightweight "gist" of the whole turn as a short-term working memory,
  //    so the assistant remembers what this conversation was about even when
  //    the history scrolls out of the context window.
  const gistTitle = u.replace(/\s+/g, " ").trim().slice(0, 90);
  if (gistTitle.length > 12) {
    const a = assistantText.trim().slice(0, 240);
    const content = a ? `Q: ${gistTitle}\nA: ${a}` : gistTitle;
    out.push({
      title: gistTitle,
      content,
      tags: tokenize(gistTitle + " " + a).slice(0, 8),
      strength: 0.4,
      wikiLinks: wikiTargets(content),
    });
  }

  // De-dup by title.
  const seen = new Set<string>();
  return out.filter((m) => {
    const k = m.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function surroundingSentence(text: string, idx: number): string {
  const start = text.lastIndexOf(".", idx);
  const end = text.indexOf(".", idx);
  const s = start === -1 ? 0 : start + 1;
  const e = end === -1 ? text.length : end;
  return text.slice(s, e).trim();
}

// =================================================================
// Persistence helpers (dedupe on title within a project)
// =================================================================

export function remember(
  projectId: string,
  convId: string,
  mem: ExtractedMemory,
  kind: "short" | "long" = "short"
): MemoryNode | null {
  const store = useMemoryStore.getState();
  const existing = store.nodes.find(
    (n) =>
      n.projectId === projectId &&
      n.title.toLowerCase() === mem.title.toLowerCase()
  );
  if (existing) {
    // Reinforce: bump strength + recall, merge tags, keep newest content.
    store.update(existing.id, {
      strength: Math.min(1, existing.strength + 0.1),
      recallCount: existing.recallCount + 1,
      tags: Array.from(new Set([...existing.tags, ...mem.tags])).slice(0, 12),
      content: mem.content,
      sourceConvIds: Array.from(new Set([...existing.sourceConvIds, convId])).slice(0, 20),
      lastAccessed: Date.now(),
    });
    return store.byId(existing.id) || null;
  }
  const node = store.create({
    projectId,
    title: mem.title,
    content: mem.content,
    tags: mem.tags,
    kind,
    strength: mem.strength,
    sourceConvIds: [convId],
  });
  return node;
}

/** Wire up wiki-links and shared-tag links for a freshly created/updated node. */
export function connectNode(nodeId: string) {
  const store = useMemoryStore.getState();
  const node = store.byId(nodeId);
  if (!node) return;
  const pool = store.nodes.filter(
    (n) =>
      n.projectId === node.projectId &&
      n.id !== node.id
  );
  // Wiki links (title -> [[title]])
  const targets = wikiTargets(node.content);
  for (const t of targets) {
    const target = pool.find(
      (n) => n.title.toLowerCase() === t.toLowerCase()
    );
    if (target) store.link(node.id, target.id, "wiki", 2);
  }
  // Shared-tag links
  for (const other of pool) {
    const shared = node.tags.filter((tg) => other.tags.includes(tg));
    if (shared.length >= 2) store.link(node.id, other.id, "shared-tag", shared.length);
  }
}

// =================================================================
// Retrieval: pick the most relevant memories within a token budget.
// Relevance = tag overlap + title/content keyword overlap, weighted by
// strength and recency. Quality over quantity.
// =================================================================

export interface RetrievedMemory {
  node: MemoryNode;
  score: number;
}

export function retrieveMemories(
  query: string,
  projectId: string | null,
  budgetTokens = 600
): RetrievedMemory[] {
  const store = useMemoryStore.getState();
  const pool = store.nodes.filter((n) =>
    projectId ? n.projectId === projectId || n.projectId === "global" : true
  );
  if (pool.length === 0) return [];

  const qTokens = tokenize(query);
  const qFreq = termFreq(qTokens);
  const qSet = new Set(qTokens);
  const now = Date.now();

  const scored: RetrievedMemory[] = pool.map((node) => {
    const titleTokens = tokenize(node.title);
    const contentTokens = tokenize(node.content);
    const tagSet = new Set(node.tags);

    let overlap = 0;
    for (const t of qSet) {
      if (tagSet.has(t)) overlap += 2;
      if (titleTokens.includes(t)) overlap += 1.5;
      if (contentTokens.includes(t)) overlap += 1;
    }
    // TF-IDF-ish weighting on the query terms.
    for (const [t, f] of qFreq) {
      const inContent = contentTokens.filter((c) => c === t).length;
      overlap += inContent * 0.5 * (1 / Math.sqrt(f));
    }

    const ageHours = (now - node.lastAccessed) / 3600_000;
    const recency = Math.exp(-ageHours / (24 * 7)); // ~1 week half-life
    const kindBoost = node.kind === "long" ? 1.3 : 1.0;

    const score =
      (overlap * 0.6 + node.strength * 0.25 + recency * 0.15) * kindBoost;

    return { node, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const picked: RetrievedMemory[] = [];
  let used = 0;
  for (const r of scored) {
    if (r.score <= 0.0001) break;
    const cost = estimateTokens(r.node.title + " " + r.node.content) + 4;
    if (used + cost > budgetTokens && picked.length >= 3) break;
    picked.push(r);
    used += cost;
    if (picked.length >= 12) break;
  }
  // Retrieval is now pure: it does NOT mutate the store. The caller
  // (buildMemoryContext) applies a single batched lastAccessed/recallCount
  // update, instead of one Zustand set + localStorage persist per picked node.
  return picked;
}

/** Compact, token-efficient rendering of memories for the system prompt. */
export function formatMemoryBlock(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m) => {
    const tagStr = m.node.tags.length ? ` #${m.node.tags.slice(0, 4).join(" #")}` : "";
    const body = m.node.content.replace(/\s+/g, " ").trim().slice(0, 220);
    return `- [${m.node.kind === "long" ? "LTM" : "STM"}] ${m.node.title}${tagStr}\n  ${body}`;
  });
  return lines.join("\n");
}

/** Build the full memory-injection string for the system prompt (or "" if none). */
export function buildMemoryContext(
  query: string,
  projectId: string | null,
  budgetTokens = 600
): string {
  const memories = retrieveMemories(query, projectId, budgetTokens);
  // Single batched update for the memories we actually used (one set + persist),
  // instead of retrieval touching each node individually on every message.
  if (memories.length) {
    useMemoryStore.getState().touchMany(memories.map((m) => m.node.id));
  }
  const block = formatMemoryBlock(memories);
  if (!block) return "";
  return [
    "## Your memory (what you remember about this person and this work)",
    "These are stored memories. Treat them as things you genuinely remember,",
    "not as data dumps. Weave them in naturally when relevant; never list them.",
    "",
    block,
  ].join("\n");
}

// =================================================================
// Consolidation: promote strong short-term memories to long-term.
// Optionally summarize duplicates via an LLM (caller-supplied) to keep
// the brain tidy. By default it's a local, token-free merge.
// =================================================================

export interface ConsolidationResult {
  promoted: number;
  merged: number;
}

export function consolidate(projectId: string | null): ConsolidationResult {
  const store = useMemoryStore.getState();
  const pool = store.nodes.filter((n) =>
    projectId ? n.projectId === projectId || n.projectId === "global" : true
  );

  let promoted = 0;
  let merged = 0;

  // Promote strong short-term memories.
  for (const n of pool) {
    if (n.kind === "short" && (n.strength >= 0.65 || n.recallCount >= 3)) {
      store.promote(n.id);
      promoted++;
    }
  }

  // Merge near-duplicate long-term memories (same dominant tag cluster + title similarity).
  const longs = store.nodes.filter(
    (n) => n.kind === "long" && (!projectId || n.projectId === projectId)
  );
  const mergedIds = new Set<string>();
  for (let i = 0; i < longs.length; i++) {
    if (mergedIds.has(longs[i].id)) continue;
    for (let j = i + 1; j < longs.length; j++) {
      if (mergedIds.has(longs[j].id)) continue;
      const a = longs[i];
      const b = longs[j];
      const sharedTags = a.tags.filter((t) => b.tags.includes(t));
      const titleSim = jaccard(tokenize(a.title), tokenize(b.title));
      if (sharedTags.length >= 2 || titleSim >= 0.6) {
        // Merge b into a.
        store.update(a.id, {
          content: a.content + "\n\n---\n" + b.content,
          tags: Array.from(new Set([...a.tags, ...b.tags])).slice(0, 12),
          strength: Math.min(1, a.strength + b.strength * 0.5),
          recallCount: a.recallCount + b.recallCount,
          sourceConvIds: Array.from(new Set([...a.sourceConvIds, ...b.sourceConvIds])).slice(0, 20),
        });
        mergedIds.add(b.id);
        merged++;
      }
    }
  }
  // Remove merged-away nodes (and rewire not needed; links auto-prune via remove).
  for (const id of mergedIds) store.remove(id);

  return { promoted, merged };
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}