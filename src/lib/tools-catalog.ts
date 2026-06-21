"use client";

// =================================================================
// Tools / Skills / Connectors catalog
// A curated marketplace-style catalog stored locally. Installing toggles
// `enabled` in the preferences store; the system prompt advertises enabled
// tools so the model knows what it can invoke.
// =================================================================

export type ToolKind = "tool" | "skill" | "connector";

export interface CatalogItem {
  id: string;
  kind: ToolKind;
  name: string;
  description: string;
  author: string;
  category: string;
  /** Capabilities advertised to the model when enabled. */
  capabilities: string[];
  featured?: boolean;
}

export const TOOLS_CATALOG: CatalogItem[] = [
  // --- Marquee skills ---
  {
    id: "frontend-design",
    kind: "skill",
    name: "Frontend Design Tool",
    description: "Veltrix designs and ships polished, production-grade frontend UI with real components, responsive layouts, and design-system consistency.",
    author: "Veltrix",
    category: "Design",
    capabilities: ["design and implement responsive frontend UI", "apply a consistent design system", "produce accessible, production-quality components"],
    featured: true,
  },
  {
    id: "superpowers",
    kind: "skill",
    name: "Superpowers",
    description: "A meta-skill that unlocks advanced planning, multi-step reasoning, and agentic task execution across tools.",
    author: "Veltrix",
    category: "Reasoning",
    capabilities: ["plan and execute multi-step tasks", "use other installed tools autonomously"],
    featured: true,
  },
  {
    id: "code-execution",
    kind: "tool",
    name: "Code Execution",
    description: "Run JavaScript/Python in a sandboxed runtime to compute, transform data, and verify code.",
    author: "Veltrix",
    category: "Developer",
    capabilities: ["execute code in a sandbox", "compute and verify results"],
  },
  {
    id: "web-search",
    kind: "tool",
    name: "Web Search",
    description: "Search the web for fresh information and cite sources.",
    author: "Veltrix",
    category: "Research",
    capabilities: ["search the web", "retrieve and summarize current information"],
  },
  {
    id: "artifact-builder",
    kind: "skill",
    name: "AI-Powered Artifacts",
    description: "Generate rich, interactive artifacts: apps, documents, diagrams, and design boards.",
    author: "Veltrix",
    category: "Design",
    capabilities: ["build interactive artifacts", "render apps, documents, and diagrams inline"],
    featured: true,
  },
  {
    id: "memory-curator",
    kind: "skill",
    name: "Memory Curator",
    description: "Extract, consolidate, and surface long-term memories across all your chats.",
    author: "Veltrix",
    category: "Personalization",
    capabilities: ["curate long-term memory", "weave remembered context into replies"],
  },
  {
    id: "data-analysis",
    kind: "skill",
    name: "Data Analysis",
    description: "Analyze CSV/JSON data, run statistics, and produce charts.",
    author: "Veltrix",
    category: "Data",
    capabilities: ["analyze tabular data", "compute statistics and render charts"],
  },
  // --- Connectors ---
  {
    id: "connector-github",
    kind: "connector",
    name: "GitHub",
    description: "Connect repositories to read issues, PRs, and code.",
    author: "Veltrix",
    category: "Connectors",
    capabilities: ["read GitHub repositories, issues, and pull requests"],
  },
  {
    id: "connector-notion",
    kind: "connector",
    name: "Notion",
    description: "Search and reference your Notion pages.",
    author: "Veltrix",
    category: "Connectors",
    capabilities: ["search and reference Notion pages"],
  },
  {
    id: "connector-slack",
    kind: "connector",
    name: "Slack",
    description: "Look up chats and messages from your Slack workspace.",
    author: "Veltrix",
    category: "Connectors",
    capabilities: ["look up Slack chats and messages"],
  },
  {
    id: "connector-google",
    kind: "connector",
    name: "Google Drive",
    description: "Search across your Google Drive documents.",
    author: "Veltrix",
    category: "Connectors",
    capabilities: ["search Google Drive documents"],
  },
  {
    id: "connector-figma",
    kind: "connector",
    name: "Figma",
    description: "Pull design files and frames into Veltrix.",
    author: "Veltrix",
    category: "Connectors",
    capabilities: ["import Figma designs"],
  },
];

export function groupedCatalog(): Record<ToolKind, CatalogItem[]> {
  const out: Record<ToolKind, CatalogItem[]> = { tool: [], skill: [], connector: [] };
  for (const item of TOOLS_CATALOG) out[item.kind].push(item);
  return out;
}

/** Build the "installed tools" section injected into the system prompt. */
export function enabledCapabilities(tools: { id: string; enabled: boolean }[]): string[] {
  const enabled = new Set(tools.filter((t) => t.enabled).map((t) => t.id));
  const caps: string[] = [];
  for (const item of TOOLS_CATALOG) {
    if (enabled.has(item.id)) caps.push(...item.capabilities);
  }
  return caps;
}
