"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, Trash2, Terminal, Code2, Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeOutput {
  type: "log" | "error" | "result" | "info";
  text: string;
  timestamp: number;
}

interface ClaudeCodeProps {
  initialCode?: string;
  language?: string;
}

export function ClaudeCode({ initialCode = "", language = "javascript" }: ClaudeCodeProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<CodeOutput[]>([]);
  const [running, setRunning] = useState(false);
  const [lang, setLang] = useState(language);
  const [copied, setCopied] = useState(false);
  // Pyodide needs same-origin access for storage; plain JS stays stricter.
  const [sandboxMode, setSandboxMode] = useState<"js" | "py">("js");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (language) setLang(language);
  }, [language]);

  // Listen for messages from sandbox iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.source !== "veltrix-sandbox") return;
      const { type, text } = e.data;
      setOutput((prev) => [...prev, { type, text, timestamp: Date.now() }]);
      if (type === "result") {
        if ((window as any).__veltrixPyGuard) clearTimeout((window as any).__veltrixPyGuard);
        setRunning(false);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);


  const execInSandbox = (html: string, mode: "js" | "py") => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setSandboxMode(mode);
    iframe.setAttribute("sandbox", mode === "py" ? "allow-scripts allow-same-origin" : "allow-scripts");
    iframe.srcdoc = html;
  };

  const runCode = useCallback(() => {
    setRunning(true);
    setOutput([]);

    // Build a sandboxed HTML page that executes JS code
    const sandboxHTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function() {
  var origLog = console.log;
  var origError = console.error;
  var origWarn = console.warn;

  function send(type, text) {
    parent.postMessage({ source: "veltrix-sandbox", type: type, text: text }, "*");
  }

  console.log = function() {
    var args = Array.prototype.slice.call(arguments);
    send("log", args.map(function(a) {
      return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a);
    }).join(" "));
    origLog.apply(console, arguments);
  };
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    send("error", args.map(function(a) {
      return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a);
    }).join(" "));
    origError.apply(console, arguments);
  };
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    send("log", args.join(" "));
    origWarn.apply(console, arguments);
  };
  console.info = function() {
    var args = Array.prototype.slice.call(arguments);
    send("info", args.join(" "));
  };

  window.onerror = function(msg, url, line, col, err) {
    send("error", msg + (line ? " (line " + line + ":" + col + ")" : ""));
  };

  try {
    ${lang === "javascript" || lang === "typescript" ? code : ""}
  } catch(e) {
    send("error", e.message);
  }

  send("result", "__done__");
})();
</script>
</body>
</html>`;

    execInSandbox(sandboxHTML, "js");

    // Safety fallback in case the done signal never arrives.
    setTimeout(() => setRunning(false), 3000);
  }, [code, lang]);

  const runHTML = useCallback(() => {
    setRunning(true);
    setOutput([]);
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = code;
    }
    setOutput([{ type: "info", text: "HTML rendered in preview", timestamp: Date.now() }]);
    setTimeout(() => setRunning(false), 500);
  }, [code]);

  const runPython = useCallback(() => {
    setRunning(true);
    setOutput([{ type: "info", text: "Loading Python (Pyodide)…", timestamp: Date.now() }]);
    const pyCode = JSON.stringify(code);
    const sandboxHTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>
</head>
<body>
<script>
function send(type, text) {
  parent.postMessage({ source: "veltrix-sandbox", type: type, text: String(text) }, "*");
}
(async function () {
  try {
    send("info", "Initializing Pyodide…");
    const pyodide = await loadPyodide();
    pyodide.setStdout({ batched: (s) => send("log", s) });
    pyodide.setStderr({ batched: (s) => send("error", s) });
    send("info", "Python ready");
    await pyodide.runPythonAsync(${pyCode});
  } catch (e) {
    send("error", e && (e.message || String(e)));
  } finally {
    send("result", "__done__");
  }
})();
</script>
</body>
</html>`;
    execInSandbox(sandboxHTML, "py");
    // Pyodide load can take a while; release the running flag when done arrives.
    const guard = setTimeout(() => setRunning(false), 60000);
    (window as any).__veltrixPyGuard = guard;
  }, [code]);

  const handleRun = () => {
    if (lang === "html" || lang === "css") {
      runHTML();
    } else if (lang === "python") {
      runPython();
    } else {
      runCode();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setOutput([]);
  };

  const isHTML = lang === "html" || lang === "css" || (code.trim().startsWith("<"));

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-medium text-foreground">Claude Code</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="h-7 px-2 rounded-md bg-surface-3 border border-border text-[12px] text-foreground focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
            title="Clear output"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50 transition-colors text-[12px] font-medium"
          >
            {running ? <Square className="h-3 w-3" fill="currentColor" /> : <Play className="h-3 w-3" fill="currentColor" />}
            Run
          </button>
        </div>
      </div>

      {/* Code editor + Output */}
      <div className="flex flex-1 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="flex items-center px-3 py-1.5 border-b border-border bg-surface-2">
            <Code2 className="h-3.5 w-3.5 text-muted-fg mr-1.5" />
            <span className="text-[11px] font-medium text-muted-fg uppercase tracking-wide">Editor</span>
          </div>
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-transparent p-4 text-[13px] font-mono text-foreground leading-relaxed resize-none focus:outline-none whitespace-pre"
            placeholder="// Write code here and click Run..."
          />
        </div>

        {/* Output / Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center px-3 py-1.5 border-b border-border bg-surface-2">
            <Terminal className="h-3.5 w-3.5 text-muted-fg mr-1.5" />
            <span className="text-[11px] font-medium text-muted-fg uppercase tracking-wide">
              {isHTML ? "Preview" : "Console"}
            </span>
          </div>
          {isHTML ? (
            <iframe
              ref={iframeRef}
              className="flex-1 w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
              {output.length === 0 ? (
                <p className="text-muted-fg/40 italic">// Output will appear here</p>
              ) : (
                output.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "py-0.5",
                      line.type === "error" && "text-red-400",
                      line.type === "log" && "text-foreground/90",
                      line.type === "info" && "text-blue-400",
                      line.type === "result" && "text-muted-fg/60 italic"
                    )}
                  >
                    {line.type === "result" ? "--- done ---" : line.text}
                  </div>
                ))
              )}
              {/* Hidden iframe for JS / Python execution */}
              <iframe
                ref={iframeRef}
                className="hidden"
                sandbox={sandboxMode === "py" ? "allow-scripts allow-same-origin" : "allow-scripts"}
                title="Sandbox"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
