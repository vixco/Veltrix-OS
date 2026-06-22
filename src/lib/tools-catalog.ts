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
    id: "image-generation",
    kind: "skill",
    name: "Image Generation",
    description: "Generate images from a text prompt. Works for everyone with no API key (Pollinations), so you can create, draw, and illustrate on demand.",
    author: "Veltrix",
    category: "Creative",
    capabilities: ["generate images from a text prompt", "render generated images inline in the chat"],
    featured: true,
  },
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
    id: "real-browser",
    kind: "tool",
    name: "Real Browser",
    description: "Drive a live headless Chromium: navigate, click, type, fill forms, screenshot, and run JS on any site. The AI browses the web for itself.",
    author: "Veltrix",
    category: "Research",
    capabilities: ["browse the web with a real browser", "click, type, and interact with live pages", "take screenshots and read rendered content"],
    featured: true,
  },
  {
    id: "host-files",
    kind: "tool",
    name: "Host Files",
    description: "Read, list, and write files directly on the host machine, plus a Files desktop app to browse them.",
    author: "Veltrix",
    category: "Developer",
    capabilities: ["read and write files on the host", "browse the host filesystem via the Files app"],
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
    description: "Read public GitHub repositories: repo info + README, files, directory tree, open issues, and open pull requests. No connection setup required.",
    author: "Veltrix",
    category: "Connectors",
    capabilities: ["read public GitHub repository info and README", "read files and list directory trees in a GitHub repo", "list open issues and pull requests in a GitHub repo"],
    featured: true,
  },
  {
    id: "connector-composio",
    kind: "connector",
    name: "Composio Integrations",
    description: "Connect to 100+ external tools like Slack, Gmail, Notion, Trello, Jira, and Linear. Enables executing actions in external apps dynamically.",
    author: "Composio",
    category: "Connectors",
    capabilities: [
      "access third-party integrations like Slack, Gmail, Notion, Salesforce, Jira, and Linear through Composio",
      "execute external API actions for Slack, Gmail, Trello, Trello, and other services via Composio",
    ],
    featured: true,
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
