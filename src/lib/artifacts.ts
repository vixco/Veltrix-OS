// ═══════════════════════════════════════════════
// Artifact Type System
// ═══════════════════════════════════════════════

export type ArtifactType = "document" | "comparison" | "code" | "planner" | "design";

export interface ArtifactSection {
  heading?: string;
  body: string;
  items?: string[];
}

export interface ComparisonItem {
  name: string;
  description?: string;
  pros: string[];
  cons: string[];
  score?: number; // 0-10
}

export interface PlannerItem {
  time?: string;
  title: string;
  description?: string;
  done?: boolean;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  // Document
  sections?: ArtifactSection[];
  // Comparison
  items?: ComparisonItem[];
  // Code
  language?: string;
  code?: string;
  // Planner
  plan?: PlannerItem[];
  // Meta
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════
// Artifact Detection & Parsing
// ═══════════════════════════════════════════════

/**
 * System prompt instructs the LLM to emit structured artifacts
 * in a tagged XML-like format. We parse those tags.
 */

export const ARTIFACT_SYSTEM_PROMPT = `You are Veltrix OS, an AI operating system that creates structured artifacts.

When the user asks you to create something (a plan, document, comparison, UI, strategy, dashboard, schedule), you MUST respond with an artifact.

## Artifact Format

Wrap artifacts in tags:

<artifact type="document" title="...">
<section heading="Section Title">
Body text here.
</section>
<section heading="Another Section">
- Bullet point
- Another point
</section>
</artifact>

<artifact type="comparison" title="...">
<item name="Option A" score="8">
<pros>Pro 1</pros><pros>Pro 2</pros>
<cons>Con 1</cons>
</item>
<item name="Option B" score="7">
<pros>Pro 1</pros><pros>Pro 2</pros>
<cons>Con 1</cons><cons>Con 2</cons>
</item>
</artifact>

<artifact type="planner" title="...">
<entry time="09:00" title="Morning">Description</entry>
<entry time="12:00" title="Lunch">Description</entry>
<entry time="14:00" title="Afternoon work">Description</entry>
</artifact>

<artifact type="code" title="..." language="html">
<![CDATA[
...code here...
]]>
</artifact>

<artifact type="design" title="..." language="html">
<![CDATA[
...full HTML with inline CSS for visual design...
]]>
</artifact>

## Rules
1. ALWAYS use artifact tags when creating content — never dump raw markdown
2. For simple questions or casual chat, just respond normally without artifacts
3. Artifacts should be rich, detailed, and well-structured
4. You can add introductory text before an artifact
5. For code artifacts, use CDATA blocks to preserve formatting
6. Document sections can contain bullet lists (lines starting with -)
7. Comparison scores are 0-10
8. For design artifacts, produce self-contained HTML with inline CSS
9. Code and design artifacts use the same structure (language + CDATA code block)`;

export function parseArtifactTags(text: string): {
  beforeArtifact: string;
  artifact: Artifact | null;
  afterArtifact: string;
} {
  const openMatch = text.match(/<artifact\s+([^>]+)>/);
  if (!openMatch) {
    return { beforeArtifact: text, artifact: null, afterArtifact: "" };
  }

  const beforeArtifact = text.slice(0, openMatch.index);
  const afterOpen = text.slice(openMatch.index! + openMatch[0].length);

  const closeMatch = afterOpen.match(/<\/artifact>/);
  if (!closeMatch) {
    return { beforeArtifact, artifact: null, afterArtifact: afterOpen };
  }

  const inner = afterOpen.slice(0, closeMatch.index);
  const afterArtifact = afterOpen.slice(closeMatch.index! + closeMatch[0].length);

  // Parse attributes from opening tag
  const attrStr = openMatch[1];
  const typeMatch = attrStr.match(/type="([^"]+)"/);
  const titleMatch = attrStr.match(/title="([^"]+)"/);
  const langMatch = attrStr.match(/language="([^"]+)"/);

  const type = (typeMatch?.[1] as ArtifactType) || "document";
  const title = titleMatch?.[1] || "Untitled";
  const language = langMatch?.[1];

  const now = Date.now();
  let artifact: Artifact;

  if (type === "code" || type === "design") {
    const codeMatch = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    artifact = {
      id: generateId(),
      type,
      title,
      language,
      code: codeMatch?.[1]?.trim() || inner.trim(),
      createdAt: now,
      updatedAt: now,
    };
  } else if (type === "comparison") {
    const items: ComparisonItem[] = [];
    const itemRegex = /<item\s+([^>]*)>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(inner)) !== null) {
      const itemAttrs = match[1];
      const itemBody = match[2];
      const nameMatch = itemAttrs.match(/name="([^"]+)"/);
      const scoreMatch = itemAttrs.match(/score="([^"]+)"/);
      const pros = [];
      const prosRegex = /<pros>([\s\S]*?)<\/pros>/g;
      let p;
      while ((p = prosRegex.exec(itemBody)) !== null) pros.push(p[1].trim());
      const cons = [];
      const consRegex = /<cons>([\s\S]*?)<\/cons>/g;
      let c;
      while ((c = consRegex.exec(itemBody)) !== null) cons.push(c[1].trim());
      items.push({
        name: nameMatch?.[1] || "Unknown",
        pros,
        cons,
        score: scoreMatch ? parseFloat(scoreMatch[1]) : undefined,
      });
    }
    artifact = { id: generateId(), type, title, items, createdAt: now, updatedAt: now };
  } else if (type === "planner") {
    const plan: PlannerItem[] = [];
    const entryRegex = /<entry\s+([^>]*)>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(inner)) !== null) {
      const attrs = match[1];
      const body = match[2].trim();
      const timeMatch = attrs.match(/time="([^"]+)"/);
      const titleMatch = attrs.match(/title="([^"]+)"/);
      plan.push({
        time: timeMatch?.[1],
        title: titleMatch?.[1] || "Untitled",
        description: body || undefined,
      });
    }
    artifact = { id: generateId(), type, title, plan, createdAt: now, updatedAt: now };
  } else {
    // document
    const sections: ArtifactSection[] = [];
    const sectionRegex = /<section\s+([^>]*)>([\s\S]*?)<\/section>/g;
    let match;
    while ((match = sectionRegex.exec(inner)) !== null) {
      const attrs = match[1];
      const body = match[2].trim();
      const headingMatch = attrs.match(/heading="([^"]+)"/);
      const items = body.match(/^- (.+)$/gm)?.map((m) => m.replace(/^- /, "").trim()) || [];
      sections.push({
        heading: headingMatch?.[1],
        body: items.length > 0 && !body.includes("\n\n") ? "" : body.replace(/^- .+$/gm, "").trim(),
        items: items.length > 0 ? items : undefined,
      });
    }
    artifact = { id: generateId(), type, title, sections, createdAt: now, updatedAt: now };
  }

  return { beforeArtifact, artifact, afterArtifact };
}

function generateId(): string {
  return `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}