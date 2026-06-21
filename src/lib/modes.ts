import type { ArtifactType } from "./artifacts";

export type WorkMode = "chat" | "code" | "design" | "cowork";

export interface ModeConfig {
  id: WorkMode;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  systemPromptExtra: string;
}

export const MODES: Record<WorkMode, ModeConfig> = {
  chat: {
    id: "chat",
    label: "Chat",
    icon: "MessageSquare",
    description: "General conversation with artifact generation",
    placeholder: "How can I help you today?",
    systemPromptExtra: "",
  },
  code: {
    id: "code",
    label: "Code",
    icon: "Code2",
    description: "Write, run, and debug code with live execution",
    placeholder: "Describe what you want to build, and I'll write and run the code...",
    systemPromptExtra: `You are in CODE mode. When the user asks you to write code, ALWAYS produce a code artifact using the artifact format with type="code". 

For HTML/CSS/JS: produce a single self-contained HTML file with inline CSS and JS so it can be previewed live.
For Python: produce clean Python code.
For JavaScript/TypeScript: produce clean, runnable code.

Always wrap code in:
<artifact type="code" title="..." language="html">
<![CDATA[
...code...
]]>
</artifact>

Include comments explaining key sections. Make code production-quality.`,
  },
  design: {
    id: "design",
    label: "Design",
    icon: "Palette",
    description: "Create visual designs, mockups, and UI components",
    placeholder: "Describe the design you want to create...",
    systemPromptExtra: `You are in DESIGN mode. Create visual designs, UI mockups, and design artifacts.

For UI mockups: produce self-contained HTML/CSS that renders a visual design.
For SVG designs: produce clean SVG code.
For diagrams: produce Mermaid or SVG diagrams.

Always wrap designs in:
<artifact type="design" title="..." language="html">
<![CDATA[
...full HTML with inline CSS...
]]>
</artifact>

Make designs visually polished, responsive, and production-ready. Use modern CSS (flexbox, grid, CSS variables). Include appropriate colors, spacing, and typography.`,
  },
  cowork: {
    id: "cowork",
    label: "Cowork",
    icon: "Users",
    description: "Collaborate on artifacts with your team",
    placeholder: "Describe what you'd like to collaborate on...",
    systemPromptExtra: `You are in COWORK mode. Help the user create shareable artifacts for collaboration.

When creating artifacts, produce them in the standard artifact format. After creating an artifact, suggest how it could be shared or collaborated on.

You can create:
- Shared documents for team review
- Code snippets for pair programming
- Design mockups for feedback
- Project plans for team alignment

Always wrap content in artifact tags so it can be shared.`,
  },
};

export function getMode(id: WorkMode): ModeConfig {
  return MODES[id];
}
