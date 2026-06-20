"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Pencil, RefreshCw } from "lucide-react";
import { useChatStore, useArtifactStore, type Message } from "@/lib/store";
import { parseArtifactTags } from "@/lib/artifacts";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUser = message.role === "user";

  const { beforeArtifact, artifact, afterArtifact } = !isUser
    ? parseArtifactTags(message.content)
    : { beforeArtifact: message.content, artifact: null, afterArtifact: "" };

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
      <div className="group px-4 py-3">
        <div className="mx-auto w-full max-w-[768px]">
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-2xl bg-surface border border-border p-3.5 text-[15px] text-foreground resize-none focus:outline-none focus:border-border-hover"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-[13px] text-muted-fg hover:text-foreground rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 text-[13px] bg-accent text-accent-fg rounded-lg hover:bg-accent-hover"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <div className="max-w-[85%]">
                <div className="rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <ActionBtn
                    onClick={() => {
                      setEditText(message.content);
                      setEditing(true);
                    }}
                    icon={<Pencil className="h-3 w-3" />}
                    label="Edit"
                  />
                  <ActionBtn
                    onClick={handleCopy}
                    icon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    label="Copy"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group px-4 py-4">
      <div className="mx-auto w-full max-w-[768px]">
        {message.error ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-[14px] text-destructive">
            {message.content}
          </div>
        ) : (
          <div className="space-y-3">
            {beforeArtifact.trim() && (
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
                            customStyle={{
                              margin: 0,
                              background: "transparent",
                              padding: 0,
                              fontSize: "13.5px",
                            }}
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
                  {beforeArtifact}
                </ReactMarkdown>
              </div>
            )}

            {artifact && <ArtifactBubble artifact={artifact} onOpen={() => openPanel(artifact.id)} />}

            {afterArtifact.trim() && (
              <div className="prose-claude">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{afterArtifact}</ReactMarkdown>
              </div>
            )}

            {message.content === "" && (
              <div className="flex items-center gap-1.5 py-1">
                <span className="h-2 w-2 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-accent/70 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        )}

        {!message.error && message.content && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBtn
              onClick={handleCopy}
              icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            />
            {onRegenerate && (
              <ActionBtn onClick={onRegenerate} icon={<RefreshCw className="h-3.5 w-3.5" />} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1.5 text-[12px] text-muted-fg hover:text-foreground rounded-lg hover:bg-surface-2 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
