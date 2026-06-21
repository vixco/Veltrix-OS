"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Search, Globe, Terminal, FileText, Wrench, CheckCircle2, XCircle, ChevronRight } from "lucide-react";

// Splits assistant text into prose segments and ```tool_call / ```tool_result
// fenced blocks so we can render tool activity as compact event cards instead
// of raw code blocks.

type Seg =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: any; raw: string }
  | { type: "tool_result"; name: string; ok: boolean; output: any; raw: string };

const BLOCK_RE = /```(tool_call|tool_result)\s*\n([\s\S]*?)```/g;

function splitSegments(text: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(text))) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const kind = m[1];
    const body = m[2].trim();
    try {
      const json = JSON.parse(body);
      if (kind === "tool_call") {
        out.push({ type: "tool_call", name: json.name, args: json.args || {}, raw: body });
      } else {
        out.push({ type: "tool_result", name: json.name, ok: !!json.ok, output: json.output, raw: body });
      }
    } catch {
      out.push({ type: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

function iconFor(name: string) {
  if (name === "web_search") return Search;
  if (name === "web_fetch") return Globe;
  if (name === "host_exec") return Terminal;
  if (name === "host_fs") return FileText;
  return Wrench;
}

function prettyArgs(args: any): string {
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

function summarizeResult(output: any): string {
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function ToolCallCard({ name, args }: { name: string; args: any }) {
  const Icon = iconFor(name);
  return (
    <div className="my-2.5 rounded-xl border border-border bg-surface-2/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <Icon className="h-4 w-4 text-accent shrink-0" />
        <span className="text-[12.5px] font-medium text-foreground">{name}</span>
        <span className="text-[11px] text-muted-fg truncate">{prettyArgs(args)}</span>
      </div>
    </div>
  );
}

function ToolResultCard({ name, ok, output }: { name: string; ok: boolean; output: any }) {
  const Icon = iconFor(name);
  const summary = summarizeResult(output);
  const tooLong = summary.length > 700;
  const preview = tooLong ? summary.slice(0, 700) + "…" : summary;
  return (
    <details className="my-2.5 rounded-xl border border-border bg-surface-2/40 group">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none select-none">
        <ChevronRight className="h-3.5 w-3.5 text-muted-fg transition-transform group-open:rotate-90 shrink-0" />
        <Icon className="h-4 w-4 text-muted-fg shrink-0" />
        <span className="text-[12.5px] font-medium text-foreground">{name}</span>
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        )}
        <span className="text-[11px] text-muted-fg truncate flex-1 ml-1">
          {ok ? "result" : "failed"} — {typeof output === "string" ? output.slice(0, 80) : preview.split("\n")[0]?.slice(0, 80) || ""}
        </span>
      </summary>
      <pre className="px-3 pb-3 pt-1 text-[11.5px] text-muted-fg whitespace-pre-wrap break-words font-mono max-h-[320px] overflow-auto">
        {preview}
      </pre>
    </details>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-claude">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const inline = !match;
            if (!inline && match) {
              return (
                <SyntaxHighlighter
                  language={match[1]}
                  style={oneDark}
                  PreTag="div"
                  customStyle={{ margin: 0, background: "transparent", padding: 0, fontSize: "13.5px" }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Renders assistant text that may contain inline tool_call / tool_result
 *  blocks, mixing prose markdown with compact tool event cards. */
export function RichText({ text }: { text: string }) {
  if (!text || !text.trim()) return null;
  const segs = splitSegments(text);
  return (
    <div className="space-y-2">
      {segs.map((s, i) => {
        if (s.type === "text") return <Markdown key={i} text={s.text} />;
        if (s.type === "tool_call") return <ToolCallCard key={i} name={s.name} args={s.args} />;
        return <ToolResultCard key={i} name={s.name} ok={s.ok} output={s.output} />;
      })}
    </div>
  );
}
