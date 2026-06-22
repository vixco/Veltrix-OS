import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
const EXT_BY_LANG: Record<string, string> = {
  html: "html",
  css: "css",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  python: "py",
  py: "py",
  json: "json",
  svg: "svg",
  markdown: "md",
  md: "md",
};

/** Trigger a browser download for arbitrary text content. */
export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Convert any artifact to a downloadable filename + text payload. */
export function artifactToDownload(artifact: import("./artifacts").Artifact): { filename: string; content: string; mime: string } {
  const slug = artifact.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "artifact";

  if (artifact.type === "code" || artifact.type === "design") {
    const ext = EXT_BY_LANG[(artifact.language || "txt").toLowerCase()] || "txt";
    return {
      filename: `${slug}.${ext}`,
      content: artifact.code || "",
      mime: ext === "html" ? "text/html" : "text/plain",
    };
  }

  if (artifact.type === "comparison") {
    const lines: string[] = [`# ${artifact.title}`, ""];
    for (const item of artifact.items || []) {
      lines.push(`## ${item.name}${item.score != null ? ` (score: ${item.score}/10)` : ""}`);
      if (item.description) lines.push(item.description);
      lines.push("**Pros:**");
      for (const p of item.pros) lines.push(`- ${p}`);
      lines.push("**Cons:**");
      for (const c of item.cons) lines.push(`- ${c}`);
      lines.push("");
    }
    return { filename: `${slug}.md`, content: lines.join("\n"), mime: "text/markdown" };
  }

  if (artifact.type === "planner") {
    const lines: string[] = [`# ${artifact.title}`, ""];
    for (const entry of artifact.plan || []) {
      lines.push(`- ${entry.time ? `**${entry.time}** ` : ""}${entry.title}`);
      if (entry.description) lines.push(`  ${entry.description}`);
    }
    return { filename: `${slug}.md`, content: lines.join("\n"), mime: "text/markdown" };
  }

  // document (and fallback)
  const lines: string[] = [`# ${artifact.title}`, ""];
  for (const section of artifact.sections || []) {
    if (section.heading) lines.push(`## ${section.heading}`);
    if (section.body) lines.push(section.body);
    if (section.items?.length) for (const it of section.items) lines.push(`- ${it}`);
    lines.push("");
  }
  return { filename: `${slug}.md`, content: lines.join("\n"), mime: "text/markdown" };
}

/** Convert a conversation to a single markdown document for export. */
export function conversationToMarkdown(
  title: string,
  messages: { role: string; content: string }[]
): string {
  const lines: string[] = [`# ${title}`, ""];
  for (const m of messages) {
    const who = m.role === "user" ? "You" : "Veltrix";
    lines.push(`## ${who}`, "");
    lines.push(m.content || "_(empty)_");
    lines.push("");
  }
  return lines.join("\n");
}

/** UTF-8 safe base64 encode/decode for embedding artifacts in share URLs. */
function b64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function b64Decode(str: string): string {
  const bin = atob(str);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Encode an artifact into a URL-safe hash fragment for backendless sharing. */
export function encodeArtifactToHash(artifact: import("./artifacts").Artifact): string {
  return b64Encode(JSON.stringify(artifact));
}

/** Decode an artifact from a hash fragment (without the leading #). */
export function decodeArtifactFromHash(hash: string): import("./artifacts").Artifact | null {
  try {
    const clean = hash.replace(/^#/, "").trim();
    if (!clean) return null;
    return JSON.parse(b64Decode(clean));
  } catch {
    return null;
  }
}

/** Read a user-selected file into an Attachment (text inlined, images as data URLs). */
// Extract text from a PDF entirely client-side. pdfjs is loaded lazily from a
// CDN at runtime (the dynamic import is hidden from the bundler so it never
// enters the Next bundle), with a matching worker version. Falls back to ""
// on any failure so the caller can attach metadata only.
const PDFJS_CDN = "https://unpkg".concat(".com/pdfjs-dist@4.8.69/build");
async function extractPdfText(file: File): Promise<string> {
  try {
    const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;
    const pdfjs: any = await dynImport(PDFJS_CDN + "/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_CDN + "/pdf.worker.min.mjs";
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data, useSystemCode: false }).promise;
    const maxPages = Math.min(doc.numPages, 200);
    let out = "";
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => it.str).filter(Boolean).join(" ") + "\n\n";
      if (out.length > 256 * 1024) break;
    }
    try { await doc.destroy(); } catch {}
    return out.slice(0, 256 * 1024).trim();
  } catch {
    return "";
  }
}

export async function readFileAsAttachment(file: File): Promise<import("./store").Attachment> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const base = { id, filename: file.name, mimeType: file.type || "application/octet-stream", size: file.size };
  if (file.type.startsWith("image/")) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    return { ...base, dataUrl };
  }
  // Treat anything that looks text-based as text; cap at ~256KB to stay sane.
  const textish = /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded|yaml|x-yaml))/.test(file.type) || /\.(txt|md|json|ya?ml|csv|tsv|js|ts|jsx|tsx|py|rb|go|rs|java|c|cc|cpp|h|hpp|cs|php|swift|kt|sh|sql|html?|css|scss|toml|ini|env|log|tex|xml)$/i.test(file.name);
  if (textish && file.size <= 256 * 1024) {
    const text = await file.text();
    return { ...base, text };
  }
  // PDF: extract text client-side via pdfjs (up to 8MB).
  if ((file.type === "application/pdf" || /\.pdf$/i.test(file.name)) && file.size <= 8 * 1024 * 1024) {
    const text = await extractPdfText(file);
    if (text) return { ...base, text };
  }
  // Binary / too-large: attach metadata only (no inlining).
  return base;
}

/** Build the prompt string for a user turn, inlining text attachments as fenced blocks. */
export function inlineAttachments(content: string, attachments?: import("./store").Attachment[]): string {
  if (!attachments || attachments.length === 0) return content;
  const blocks: string[] = [];
  for (const a of attachments) {
    if (a.text != null) {
      const ext = a.filename.split(".").pop() || "";
      blocks.push(`\n\n--- ${a.filename} ---\n\`\`\`${ext}\n${a.text}\n\`\`\``);
    } else {
      blocks.push(`\n\n[Attached file: ${a.filename} (${formatBytes(a.size)})]`);
    }
  }
  return (content.trim() ? content : "") + blocks.join("");
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Build the message content for a user turn. Returns a plain string when there
 * are no images (cheap fast path, works with every provider), or an OpenAI-style
 * ContentPart[] when images are attached so vision models can see them.
 * Text attachments are always inlined into the text part.
 */
export function buildMessageContent(
  text: string,
  attachments?: import("./store").Attachment[]
): string | import("./providers").ContentPart[] {
  const textPart = inlineAttachments(text, attachments);
  const images = (attachments || []).filter((a) => a.dataUrl && a.mimeType.startsWith("image/"));
  if (images.length === 0) return textPart;
  const parts: import("./providers").ContentPart[] = [];
  if (textPart.trim()) parts.push({ type: "text", text: textPart });
  for (const img of images) {
    parts.push({ type: "image_url", image_url: { url: img.dataUrl! } });
  }
  return parts;
}
