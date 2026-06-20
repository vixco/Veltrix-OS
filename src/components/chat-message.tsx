"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  Check,
  Pencil,
  RefreshCw,
  FileText,
  X,
} from "lucide-react";
import { useChatStore, useArtifactStore, type Message } from "@/lib/store";
import { parseArtifactTags } from "@/lib/artifacts";
import { cn, timeAgo } from "@/lib/utils";
import { ArtifactBubble } from "./artifact-bubble";

export function ChatMessage({
  message,
  convId,
  onRegenerate,
}: {
  message: Message;
  convId: string;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const openPanel = useArtifactStore((s) => s.openPanel);
  const artifacts = useArtifactStore((s) => s.artifacts);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUser = message.role === "user";

  // Parse artifact from assistant messages
  const { beforeArtifact, artifact, afterArtifact } = !isUser
    ? parseArtifactTags(message.content)
    : { beforeArtifact: message.content, artifact: null, afterArtifact: "" };

  // Store parsed artifact
  useEffect(() => {
    if (artifact && message.artifactId !== artifact.id) {
      useArtifactStore.getState().setArtifact(artifact);
      updateMessage(convId, message.id, { artifactId: artifact.id });
    }
  }, [artifact, message.artifactId, convId, message.id, updateMessage]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveEdit = () => {
    updateMessage(convId, message.id, { content: editText });
    setEditing(false);
  };

  if (isUser) {
    return (
      <div className="group flex justify-end px-6 py-3">
        <div className="max-w-[75%]">
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-xl bg-surface-2 border border-border p-3 text-sm text-foreground resize-none focus:outline-none focus:border-border-hover"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs text-muted-fg hover:text-foreground rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent/90"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
                {message.content}
              </div>
              <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                <ActionBtn onClick={() => { setEditText(message.content); setEditing(true); }} icon={<Pencil className="h-3 w-3" />} label="Edit" />
                <ActionBtn onClick={handleCopy} icon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} label="Copy" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group px-6 py-4">
      <div className="flex gap-3 max-w-[85%]">
        {/* Avatar */}
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-white">V</span>
        </div>
        <div className="flex-1 min-w-0">
          {message.error ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {message.content}
            </div>
          ) : (
            <div className="space-y-3">
              {beforeArtifact.trim() && (
                <div className="prose-veltrix">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        if (match) {
                          return (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                background: "rgb(20 20 24)",
                                border: "1px solid rgb(38 38 44)",
                                borderRadius: "10px",
                                fontSize: "13px",
                              }}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >
                    {beforeArtifact}
                  </ReactMarkdown>
                </div>
              )}

              {/* Artifact bubble */}
              {artifact && (
                <ArtifactBubble
                  artifact={artifact}
                  onOpen={() => openPanel(artifact.id)}
                />
              )}

              {afterArtifact.trim() && (
                <div className="prose-veltrix">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {afterArtifact}
                  </ReactMarkdown>
                </div>
              )}

              {/* Streaming cursor */}
              {message.content === "" && (
                <div className="flex items-center gap-2 text-muted-fg">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!message.error && message.content && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionBtn onClick={handleCopy} icon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} label="Copy" />
              {onRegenerate && <ActionBtn onClick={onRegenerate} icon={<RefreshCw className="h-3 w-3" />} label="Retry" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-fg hover:text-foreground rounded-md hover:bg-surface-2 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}