"use client";

// =================================================================
// Veltrix Agent core: self-model + tool-use loop.
// Turns Veltrix from a single-shot chat relay into an autonomous,
// self-aware agent that can call real tools (web search, web fetch,
// host shell, host filesystem) and loop until it has a final answer.
// No external API keys required: web + host access run on the Next.js
// server (host) via /api/host/* routes.
// =================================================================

import type { ChatMessage, ContentPart, StreamChunk } from "./providers";
import { usePreferences } from "./preferences";
import { hostFetch } from "./host-client";

function resolveAgentPath(filePath: string | undefined, workspacePath: string): string | undefined {
  if (!filePath) return undefined;
  if (!workspacePath) return filePath;

  // Check if filePath is already absolute
  const isAbsolute =
    filePath.startsWith("/") ||
    filePath.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(filePath);

  if (isAbsolute) return filePath;

  // Combine workspacePath and filePath.
  const separator = workspacePath.includes("/") ? "/" : "\\";
  return workspacePath.endsWith(separator)
    ? `${workspacePath}${filePath}`
    : `${workspacePath}${separator}${filePath}`;
}

// -----------------------------------------------------------------
// Host environment (cached after first probe)
// -----------------------------------------------------------------

interface HostEnv {
  platform: string; // win32 / darwin / linux
  cwd: string;
  hostname: string;
  nodeVersion?: string;
}

let _hostEnv: HostEnv | null | undefined; // undefined = not yet probed

export async function getHostEnv(): Promise<HostEnv | null> {
  if (_hostEnv !== undefined) return _hostEnv;
  try {
    const res = await hostFetch("/api/host/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "hostname", timeoutMs: 4000 }),
    });
    if (!res.ok) { _hostEnv = null; return null; }
    const data = await res.json();
    const hostname = String(data.stdout || "").trim();
    let nodeVersion: string | undefined;
    try {
      const r2 = await hostFetch("/api/host/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "node -v", timeoutMs: 4000 }),
      });
      if (r2.ok) nodeVersion = String((await r2.json()).stdout || "").trim();
    } catch {}
    _hostEnv = {
      platform: data.platform || process.platform,
      cwd: data.cwd || "",
      hostname,
      nodeVersion,
    };
    return _hostEnv;
  } catch {
    _hostEnv = null;
    return null;
  }
}

// -----------------------------------------------------------------
// Self-model: a persistent, accurate picture of who Veltrix is, what it
// is running on, and what it can do. Injected into the system prompt so
// the model genuinely "knows what everything is".
// -----------------------------------------------------------------

export interface SelfContextOptions {
  version: string;
  providerLabel: string;
  model: string;
  tools: AgentTool[];
  hostAccess: boolean;
  webAccess: boolean;
  browserAccess: boolean;
}

export async function buildSelfContext(o: SelfContextOptions): Promise<string> {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const host = o.hostAccess ? await getHostEnv() : null;
  const lines: string[] = [
    "## Who you are (self-model)",
    "You are Veltrix, the autonomous assistant inside Veltrix OS v" + o.version + ".",
    "You are a real agent, not a text-only chatbot: you can think, decide, call tools, observe their results, and keep going until the task is genuinely done.",
    "You have a persistent self-model and you act with awareness of your own identity, your capabilities, your environment, and the person you are helping.",
    "",
    "## Current situation",
    "- Date/time: " + now.toString(),
    "- Timezone: " + tz,
    "- Active model: " + (o.model || "(none)") + " via " + o.providerLabel,
    "- App: Veltrix OS v" + o.version + " (self-hosted, runs in the browser + a local Next.js host server)",
    "- Capabilities on right now: " + [
      o.webAccess ? "web (search + fetch)" : null,
      o.browserAccess ? "real browser (Chromium, driven live)" : null,
      o.hostAccess ? "host shell + filesystem" : null,
    ].filter(Boolean).join(" | ") || "none",
  ];
  if (host) {
    const workspacePath = usePreferences.getState().workspacePath;
    lines.push(
      "- Host machine: " + host.platform + " (" + host.hostname + ")",
      "- Host working directory: " + host.cwd,
      workspacePath ? "- Configured agent workspace: " + workspacePath : "",
      host.nodeVersion ? "- Node on host: " + host.nodeVersion : ""
    );
  } else {
    lines.push("- Host machine: direct host access is OFF (web tools still work).");
  }
  lines.push(
    "",
    "## What you can actually do",
    "Use tools by emitting a fenced code block tagged `tool_call` containing one JSON object on its own:",
    "",
    "```tool_call",
    "{\"name\":\"web_search\",\"args\":{\"query\":\"latest stable Node.js version\"}}",
    "```",
    "",
    "After you emit a tool_call block, the system runs the tool and appends a `tool_result` block with the outcome. Read it, then continue. You may call tools multiple times across several steps. When you have the final answer for the person, reply in normal prose with NO tool_call block and stop.",
    "Never fabricate tool output. If a tool fails, say so plainly and try another approach.",
    "Prefer one tool call per block. Keep tool args valid JSON. Do not ask permission for routine read-only actions (search, fetch, read files); just do them. Ask before anything destructive (deleting files, running a command with side effects).",
    "",
  );
  if (o.tools.length) {
    lines.push("## Available tools");
    for (const t of o.tools) {
      lines.push("- " + t.name + ": " + t.description);
      lines.push("  args: " + t.argsSchema);
    }
  } else {
    lines.push("## Tools", "No tools are enabled right now. Reply normally.");
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

// -----------------------------------------------------------------
// Tools
// -----------------------------------------------------------------

export interface AgentTool {
  name: string;
  description: string;
  argsSchema: string;
  run: (args: Record<string, any>, signal: AbortSignal) => Promise<{ ok: boolean; output: any; images?: string[] }>;
}

async function postJSON(url: string, body: any, signal?: AbortSignal) {
  const res = await hostFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 4000) }; }
  if (!res.ok) return { ok: false, output: json };
  return { ok: true, output: json };
}

const MAX_OUT = 16000;

function cap(s: string): string {
  return s.length > MAX_OUT ? s.slice(0, MAX_OUT) + "\n…[truncated]" : s;
}

export async function buildToolset(opts: {
  webAccess: boolean;
  hostAccess: boolean;
  browserAccess: boolean;
  imageGen?: boolean;
  github?: boolean;
  composio?: boolean;
  composioApiKey?: string;
}): Promise<AgentTool[]> {
  const tools: AgentTool[] = [];
  // Image generation is a core capability (ChatGPT/Claude parity). No API key
  // required: uses Pollinations, which renders any text prompt into a PNG via
  // a stable URL the UI can display directly. Gated by imageGen (default on).
  if (opts.imageGen !== false) tools.push({
    name: "image_gen",
    description: "Generate an image from a text prompt. Returns { url, width, height, prompt }. The url is a direct PNG you can show with an image artifact. Always render the returned url in an <artifact type=\"image\"> right after.",
    argsSchema: "{ prompt: string, width?: number, height?: number }",
    run: async (a) => {
      const prompt = String(a.prompt || "").trim();
      if (!prompt) return { ok: false, output: { error: "image_gen requires a non-empty prompt" } };
      const width = Math.min(2048, Math.max(256, Number(a.width) || 1024));
      const height = Math.min(2048, Math.max(256, Number(a.height) || 1024));
      const seed = Math.floor(Math.random() * 1e9);
      const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) +
        "?width=" + width + "&height=" + height + "&seed=" + seed + "&nologo=true&model=flux";
      return { ok: true, output: { url, width, height, prompt } };
    },
  });

  if (opts.webAccess) {
    tools.push({
      name: "web_search",
      description: "Search the web for fresh information. Returns a list of {title,url,snippet}. No API key.",
      argsSchema: "{ query: string, count?: number }",
      run: async (a, sig) => {
        const r = await postJSON("/api/host/web", { action: "search", query: String(a.query || ""), count: a.count ?? 6 }, sig);
        return { ok: r.ok, output: r.ok ? capOut(r.output) : r.output };
      },
    });
    tools.push({
      name: "web_fetch",
      description: "Fetch any public URL and return its readable text (or raw HTML). No API key.",
      argsSchema: "{ url: string, raw?: boolean, maxChars?: number }",
      run: async (a, sig) => {
        const r = await postJSON("/api/host/web", { action: "fetch", url: String(a.url || ""), raw: !!a.raw, maxChars: a.maxChars ?? 16000 }, sig);
        return { ok: r.ok, output: r.ok ? capOut(r.output) : r.output };
      },
    });
  }
  if (opts.browserAccess) {
    tools.push({
      name: "browser",
      description: "Drive a REAL headless Chromium browser live: navigate URLs, click, fill forms, type, press keys, scroll, take screenshots, extract text/html, run JS, solve captchas (using action: 'solve_captcha'), and manage tabs. Use this when a page needs interaction or JS to render (web_fetch only returns static text). Start with browser(navigate), then read with browser(text) or browser(screenshot) to see what is on screen.",
      argsSchema: "{ action: 'navigate'|'new_tab'|'tabs'|'close_tab'|'screenshot'|'text'|'html'|'title'|'click'|'fill'|'type'|'press'|'select'|'hover'|'scroll'|'evaluate'|'wait'|'wait_for'|'back'|'forward'|'links'|'close'|'solve_captcha', url?, tabId?, selector?, value?, text?, key?, fn?, full?, limit? }",
      run: async (a, sig) => {
        const r = await postJSON("/api/host/browser", {
          action: a.action,
          url: a.url,
          tabId: a.tabId,
          selector: a.selector,
          value: a.value,
          text: a.text,
          key: a.key,
          fn: a.fn,
          full: a.full,
          limit: a.limit,
          values: a.values,
          dy: a.dy,
          dx: a.dx,
          ms: a.ms,
        }, sig);
        if (r.ok && typeof r.output?.text === "string") r.output.text = cap(r.output.text);
        if (r.ok && typeof r.output?.html === "string") r.output.html = cap(r.output.html);
        // Screenshots are large base64 data URLs. Keep them OUT of the text
        // tool_result (would bloat context) and instead hand the image to the
        // agent loop via the `images` channel, which attaches it as a vision
        // content part on the next model call so vision-capable models can
        // actually SEE the rendered page. Leave a compact marker in the text.
        const images: string[] = [];
        if (r.ok && typeof r.output?.screenshot === "string") {
          const dataUrl = r.output.screenshot;
          r.output.screenshotBytes = r.output.bytes;
          r.output.screenshotCaptured = true;
          r.output.screenshot = "[screenshot captured: " + r.output.bytes + " bytes, page=\"" + (r.output.title || r.output.url || "") + "\" — the image is attached to you visually]";
          images.push(dataUrl);
        }
        return { ok: r.ok, output: r.output, images };
      },
    });
  }
  if (opts.hostAccess) {
    tools.push({
      name: "host_exec",
      description: "Run a shell command on the host machine. Returns {platform,cwd,stdout,stderr,exitCode}. Use for system info, scripts, git, etc. Be careful with side effects.",
      argsSchema: "{ command: string, cwd?: string, timeoutMs?: number }",
      run: async (a, sig) => {
        const workspacePath = usePreferences.getState().workspacePath;
        const targetCwd = a.cwd ? (workspacePath ? resolveAgentPath(a.cwd, workspacePath) : a.cwd) : (workspacePath || undefined);
        const r = await postJSON("/api/host/exec", { command: String(a.command || ""), cwd: targetCwd, timeoutMs: a.timeoutMs ?? 30000 }, sig);
        if (r.ok) {
          const o = r.output;
          // trim potentially huge stdout/stderr for context safety
          if (typeof o.stdout === "string") o.stdout = cap(o.stdout);
          if (typeof o.stderr === "string") o.stderr = cap(o.stderr);
        }
        return r;
      },
    });
    tools.push({
      name: "host_fs",
      description: "Read/list/write files on the host. action: 'list' (dir entries), 'read' (file text), 'stat', 'write'.",
      argsSchema: "{ action: 'list'|'read'|'stat'|'write', path?: string, content?: string, maxChars?: number }",
      run: async (a, sig) => {
        const workspacePath = usePreferences.getState().workspacePath;
        const targetPath = a.path ? (workspacePath ? resolveAgentPath(a.path, workspacePath) : a.path) : undefined;
        const r = await postJSON("/api/host/fs", { action: a.action, path: targetPath, content: a.content, maxChars: a.maxChars ?? 60000 }, sig);
        if (r.ok && typeof r.output?.content === "string") r.output.content = cap(r.output.content);
        return r;
      },
    });
  }
  if (opts.github) {
    tools.push({
      name: "github",
      description: "Read PUBLIC GitHub repositories: repo metadata + README, read a file, list a path/tree, list open issues, list open pull requests. No auth needed. repo is owner/name.",
      argsSchema: '{ action: "repo"|"file"|"tree"|"issues"|"pulls", repo: string, path?: string, n?: number }',
      run: async (a, sig) => {
        const repo = String(a.repo || "").trim();
        if (!repo || !repo.includes("/")) return { ok: false, output: { error: "github requires repo as owner/name" } };
        const action = a.action || "repo";
        const base = "https://api.github.com/repos/" + repo;
        const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
        try {
          if (action === "repo") {
            const r = await fetch(base, { headers, signal: sig });
            if (!r.ok) return { ok: false, output: { error: "GitHub API " + r.status } };
            const j = await r.json();
            let readme = "";
            try {
              const rr = await fetch(base + "/readme", { headers: { ...headers, Accept: "application/vnd.github.raw+json" }, signal: sig });
              if (rr.ok) readme = cap(await rr.text());
            } catch {}
            return { ok: true, output: { name: j.full_name, description: j.description, stars: j.stargazers_count, language: j.language, defaultBranch: j.default_branch, updatedAt: j.updated_at, license: j.license?.spdx_id, readme } };
          }
          if (action === "file") {
            const path = String(a.path || "").replace(/^\//, "");
            const r = await fetch(base + "/contents/" + path, { headers: { ...headers, Accept: "application/vnd.github.raw+json" }, signal: sig });
            if (!r.ok) return { ok: false, output: { error: "GitHub API " + r.status } };
            return { ok: true, output: { path, content: cap(await r.text()) } };
          }
          if (action === "tree") {
            const path = String(a.path || "").replace(/^\//, "");
            const r = await fetch(base + "/contents/" + path, { headers, signal: sig });
            if (!r.ok) return { ok: false, output: { error: "GitHub API " + r.status } };
            const j = await r.json();
            const list = Array.isArray(j) ? j.map((e: any) => ({ name: e.name, type: e.type, size: e.size })) : [{ name: j.name, type: j.type }];
            return { ok: true, output: { entries: list } };
          }
          if (action === "issues") {
            const n = Math.min(30, Number(a.n) || 10);
            const r = await fetch(base + "/issues?state=open&per_page=" + n, { headers, signal: sig });
            if (!r.ok) return { ok: false, output: { error: "GitHub API " + r.status } };
            const j = await r.json();
            return { ok: true, output: { issues: j.filter((i: any) => !i.pull_request).map((i: any) => ({ number: i.number, title: i.title, state: i.state, url: i.html_url, createdAt: i.created_at })) } };
          }
          if (action === "pulls") {
            const n = Math.min(30, Number(a.n) || 10);
            const r = await fetch(base + "/pulls?state=open&per_page=" + n, { headers, signal: sig });
            if (!r.ok) return { ok: false, output: { error: "GitHub API " + r.status } };
            const j = await r.json();
            return { ok: true, output: { pulls: j.map((p: any) => ({ number: p.number, title: p.title, state: p.state, url: p.html_url, createdAt: p.created_at })) } };
          }
          return { ok: false, output: { error: "unknown github action: " + action } };
        } catch (e: any) {
          return { ok: false, output: { error: e?.message || String(e) } };
        }
      },
    });
  }

  if (opts.composio) {
    try {
      const r = await postJSON("/api/host/composio", {
        action: "list_tools",
        composioApiKey: opts.composioApiKey,
      });
      if (r && r.ok && r.output && Array.isArray(r.output.tools)) {
        for (const tool of r.output.tools) {
          tools.push({
            name: tool.name,
            description: tool.description || `Composio action: ${tool.name}`,
            argsSchema: convertJsonSchemaToArgsSchema(tool.inputParameters || tool.input_parameters),
            run: async (args, sig) => {
              const res = await postJSON("/api/host/composio", {
                action: "execute_action",
                actionName: tool.name,
                arguments: args,
                composioApiKey: opts.composioApiKey,
              }, sig);
              return { ok: res.ok, output: res.output };
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to load Composio tools:", err);
    }
  }

  return tools;
}

function convertJsonSchemaToArgsSchema(schema: any): string {
  if (!schema || typeof schema !== "object") return "{}";
  const props = schema.properties || {};
  const required = new Set<string>(schema.required || []);
  const entries: string[] = [];

  for (const [key, val] of Object.entries(props)) {
    const isRequired = required.has(key);
    const typeStr = (val as any).type || "any";
    const enumVal = (val as any).enum;
    const typeName = enumVal ? enumVal.map((e: any) => typeof e === 'string' ? `'${e}'` : String(e)).join("|") : typeStr;
    entries.push(`${key}${isRequired ? "" : "?"}: ${typeName}`);
  }

  return `{ ${entries.join(", ")} }`;
}

function capOut(o: any): any {
  if (o && typeof o.text === "string") o.text = cap(o.text);
  return o;
}

// -----------------------------------------------------------------
// Tool-call parsing
// -----------------------------------------------------------------

export interface ParsedToolCall {
  name: string;
  args: Record<string, any>;
  /** start index of the whole ```tool_call ... ``` block in content */
  start: number;
  end: number;
}

const TOOL_CALL_RE = /```tool_call\s*\n([\s\S]*?)```/g;

export function parseToolCalls(content: string): ParsedToolCall[] {
  const out: ParsedToolCall[] = [];
  let m: RegExpExecArray | null;
  TOOL_CALL_RE.lastIndex = 0;
  while ((m = TOOL_CALL_RE.exec(content))) {
    const body = m[1].trim();
    try {
      const json = JSON.parse(body);
      if (json && typeof json.name === "string") {
        out.push({ name: json.name, args: json.args || {}, start: m.index, end: m.index + m[0].length });
      }
    } catch {
      // ignore malformed
    }
  }
  return out;
}

const TOOL_RESULT_RE = /```tool_result\s*\n([\s\S]*?)```/g;

/** Tool calls whose index range is not followed by a tool_result block. */
export function pendingToolCalls(content: string): ParsedToolCall[] {
  const calls = parseToolCalls(content);
  if (calls.length === 0) return [];
  // a call is "resolved" if there is a tool_result block that starts after it
  const resultStarts: number[] = [];
  let m: RegExpExecArray | null;
  TOOL_RESULT_RE.lastIndex = 0;
  while ((m = TOOL_RESULT_RE.exec(content))) resultStarts.push(m.index);
  if (resultStarts.length === 0) return calls;
  return calls.filter((c) => !resultStarts.some((rs) => rs > c.end));
}

// -----------------------------------------------------------------
// Agent loop
// -----------------------------------------------------------------

export interface AgentLoopHooks {
  /** Stream one completion for the given messages; returns chunks. */
  stream: (messages: ChatMessage[], signal: AbortSignal) => Promise<ReadableStream<StreamChunk>>;
  /** Replace the assistant message content with the full accumulated text. */
  onContent: (full: string) => void;
  onThinking: (full: string) => void;
}

export async function runAgentTurn(opts: {
  messages: ChatMessage[];
  tools: AgentTool[];
  hooks: AgentLoopHooks;
  signal: AbortSignal;
  maxIterations?: number;
}): Promise<{ content: string; iterations: number; toolCalls: number; finishReason?: string }> {
  const maxIters = Math.max(1, opts.maxIterations ?? 6);
  let content = "";
  let thinking = "";
  let toolCalls = 0;
  let finishReason: string | undefined;
  // Screenshots captured by the most recent iteration's tool calls, handed
  // back to the model as image content parts on the next call so vision
  // models genuinely see what the browser rendered.
  let pendingImages: string[] = [];

  for (let iter = 0; iter < maxIters; iter++) {
    // First iteration: plain history. Later iterations: prefill with the
    // accumulated assistant trace so the model continues from its own tool
    // calls + results (works on OpenAI, Anthropic, Ollama, LM Studio). When
    // the previous iteration captured browser screenshots, append a synthetic
    // user turn carrying them as image parts (vision-capable models then see
    // the rendered page; text-only models simply get the text marker above).
    let msgs: ChatMessage[];
    if (content.length === 0) {
      msgs = opts.messages;
    } else {
      msgs = [...opts.messages, { role: "assistant" as const, content }];
      if (pendingImages.length > 0) {
        const parts: ContentPart[] = [
          { type: "text", text: "[Visual feedback from your last browser tool call(s) — these are screenshots of what is currently on screen. Use them to decide the next action.]" },
          ...pendingImages.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ];
        msgs = [...msgs, { role: "user" as const, content: parts }];
      }
    }
    pendingImages = [];

    const stream = await opts.hooks.stream(msgs, opts.signal);
    const reader = stream.getReader();
    let newDeltaThisIter = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.thinking) {
        thinking += value.thinking;
        opts.hooks.onThinking(thinking);
      }
      if (value?.delta) {
        content += value.delta;
        newDeltaThisIter += value.delta;
        opts.hooks.onContent(content);
      }
      if (value?.finishReason) finishReason = value.finishReason;
    }

    const pending = pendingToolCalls(content);
    if (pending.length === 0) {
      return { content, iterations: iter + 1, toolCalls, finishReason };
    }
    // No progress possible: avoid infinite loop.
    if (newDeltaThisIter.trim() === "" && iter > 0) {
      return { content, iterations: iter + 1, toolCalls, finishReason };
    }

    // Execute each pending tool call and append a tool_result block.
    for (const call of pending) {
      toolCalls++;
      const tool = opts.tools.find((t) => t.name === call.name);
      let result: { ok: boolean; output: any; images?: string[] };
      if (!tool) {
        result = { ok: false, output: { error: "Unknown tool: " + call.name } };
      } else {
        try {
          result = await tool.run(call.args, opts.signal);
        } catch (err: any) {
          result = { ok: false, output: { error: err?.message || String(err) } };
        }
      }
      if (result.images && result.images.length) {
        for (const img of result.images) pendingImages.push(img);
      }
      const block =
        "\n\n```tool_result\n" +
        JSON.stringify({ name: call.name, ok: result.ok, output: result.output }) +
        "\n```\n";
      content += block;
      opts.hooks.onContent(content);
      if (opts.signal.aborted) return { content, iterations: iter + 1, toolCalls, finishReason };
    }
    // loop again: model will read the results and continue
  }
  return { content, iterations: maxIters, toolCalls, finishReason };
}
