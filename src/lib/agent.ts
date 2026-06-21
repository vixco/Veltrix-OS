"use client";

// =================================================================
// Veltrix Agent core: self-model + tool-use loop.
// Turns Veltrix from a single-shot chat relay into an autonomous,
// self-aware agent that can call real tools (web search, web fetch,
// host shell, host filesystem) and loop until it has a final answer.
// No external API keys required: web + host access run on the Next.js
// server (host) via /api/host/* routes.
// =================================================================

import type { ChatMessage, StreamChunk } from "./providers";

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
    const res = await fetch("/api/host/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "hostname", timeoutMs: 4000 }),
    });
    if (!res.ok) { _hostEnv = null; return null; }
    const data = await res.json();
    const hostname = String(data.stdout || "").trim();
    let nodeVersion: string | undefined;
    try {
      const r2 = await fetch("/api/host/exec", {
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
  ];
  if (host) {
    lines.push(
      "- Host machine: " + host.platform + " (" + host.hostname + ")",
      "- Host working directory: " + host.cwd,
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
  run: (args: Record<string, any>, signal: AbortSignal) => Promise<{ ok: boolean; output: any }>;
}

async function postJSON(url: string, body: any, signal?: AbortSignal) {
  const res = await fetch(url, {
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

export function buildToolset(opts: { webAccess: boolean; hostAccess: boolean }): AgentTool[] {
  const tools: AgentTool[] = [];
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
  if (opts.hostAccess) {
    tools.push({
      name: "host_exec",
      description: "Run a shell command on the host machine. Returns {platform,cwd,stdout,stderr,exitCode}. Use for system info, scripts, git, etc. Be careful with side effects.",
      argsSchema: "{ command: string, cwd?: string, timeoutMs?: number }",
      run: async (a, sig) => {
        const r = await postJSON("/api/host/exec", { command: String(a.command || ""), cwd: a.cwd, timeoutMs: a.timeoutMs ?? 30000 }, sig);
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
        const r = await postJSON("/api/host/fs", { action: a.action, path: a.path, content: a.content, maxChars: a.maxChars ?? 60000 }, sig);
        if (r.ok && typeof r.output?.content === "string") r.output.content = cap(r.output.content);
        return r;
      },
    });
  }
  return tools;
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
}): Promise<{ content: string; iterations: number; toolCalls: number }> {
  const maxIters = Math.max(1, opts.maxIterations ?? 6);
  let content = "";
  let thinking = "";
  let toolCalls = 0;

  for (let iter = 0; iter < maxIters; iter++) {
    // First iteration: plain history. Later iterations: prefill with the
    // accumulated assistant trace so the model continues from its own tool
    // calls + results (works on OpenAI, Anthropic, Ollama, LM Studio).
    const msgs: ChatMessage[] =
      content.length > 0
        ? [...opts.messages, { role: "assistant" as const, content }]
        : opts.messages;

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
    }

    const pending = pendingToolCalls(content);
    if (pending.length === 0) {
      return { content, iterations: iter + 1, toolCalls };
    }
    // No progress possible: avoid infinite loop.
    if (newDeltaThisIter.trim() === "" && iter > 0) {
      return { content, iterations: iter + 1, toolCalls };
    }

    // Execute each pending tool call and append a tool_result block.
    for (const call of pending) {
      toolCalls++;
      const tool = opts.tools.find((t) => t.name === call.name);
      let result: { ok: boolean; output: any };
      if (!tool) {
        result = { ok: false, output: { error: "Unknown tool: " + call.name } };
      } else {
        try {
          result = await tool.run(call.args, opts.signal);
        } catch (err: any) {
          result = { ok: false, output: { error: err?.message || String(err) } };
        }
      }
      const block =
        "\n\n```tool_result\n" +
        JSON.stringify({ name: call.name, ok: result.ok, output: result.output }) +
        "\n```\n";
      content += block;
      opts.hooks.onContent(content);
      if (opts.signal.aborted) return { content, iterations: iter + 1, toolCalls };
    }
    // loop again: model will read the results and continue
  }
  return { content, iterations: maxIters, toolCalls };
}
