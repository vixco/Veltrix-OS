"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, Pencil, RefreshCw, FileText } from "lucide-react";
import { useChatStore, useArtifactStore, type Message } from "@/lib/store";
import { parseArtifactTags } from "@/lib/artifacts";
import { ArtifactInline } from "./artifact-inline";
import { ArtifactCreating } from "./artifact-creating";
import { formatBytes } from "@/lib/utils";
import { ThinkingBlock } from "./thinking-block";
import { RichText } from "./tool-block";

export function ChatMessage({
  message,
  convId,
  onRegenerate,
  onEditUser,
  streaming,
}: {
  message: Message;
  convId: string;
  onRegenerate?: () => void;
  onEditUser?: (newText: string) => void;
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const openPanel = useArtifactStore((s) => s.openPanel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUser = message.role === "user";

  const { beforeArtifact, artifact, afterArtifact, artifactInProgress } = !isUser
    ? parseArtifactTags(message.content)
    : { beforeArtifact: message.content, artifact: null, afterArtifact: "", artifactInProgress: null };

  // Register a parsed artifact once per (stable) artifact id. Depend on the
  // id string rather than the `artifact` object, which is a fresh reference
  // every render and would otherwise retrigger this effect constantly.
  useEffect(() => {
    if (artifact && message.artifactId !== artifact.id) {
      useArtifactStore.getState().setArtifact(artifact);
      updateMessage(convId, message.id, { artifactId: artifact.id });
    }
  }, [artifact?.id, message.artifactId, convId, message.id, updateMessage]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveEdit = () => {
    setEditing(false);
    if (onEditUser) {
      onEditUser(editText.trim());
    } else {
      updateMessage(convId, message.id, { content: editText });
    }
  };

  if (isUser) {
    return (
      <div className="group px-4 py-3 animate-slide-up">
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
                  disabled={!editText.trim()}
                  className="px-3.5 py-1.5 text-[13px] bg-accent text-accent-fg rounded-lg hover:bg-accent-hover disabled:opacity-40"
                >
                  {onEditUser ? "Save & resend" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <div className="max-w-[85%]">
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-1.5 justify-end">
                    {message.attachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 max-w-[220px]"
                      >
                        {a.dataUrl ? (
                          <img src={a.dataUrl} alt={a.filename} className="h-7 w-7 rounded object-cover shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-fg shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate max-w-[140px]">{a.filename}</p>
                          <p className="text-[10px] text-muted-fg">{formatBytes(a.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
    <div className="group px-4 py-4 animate-slide-up">
      <div className="mx-auto w-full max-w-[768px]">
        {message.error ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-[14px] text-destructive">
            {message.content}
          </div>
        ) : (
          <div className="space-y-3">
            {message.thinking && (
              <ThinkingBlock
                thinking={message.thinking}
                thinkingMs={message.thinkingMs}
                contentEmpty={message.content === ""}
              />
            )}

            {beforeArtifact.trim() && <RichText text={beforeArtifact} />}

            {artifact && (
              <ArtifactInline artifact={artifact} onOpenPanel={() => openPanel(artifact.id)} />
            )}

            {artifactInProgress && !artifact && (
              <ArtifactCreating type={artifactInProgress.type} title={artifactInProgress.title} />
            )}

            {afterArtifact.trim() && !artifactInProgress && <RichText text={afterArtifact} />}

            {streaming && message.content && !beforeArtifact.includes("<artifact") && !artifactInProgress && (
              <span className="stream-caret inline-block align-text-bottom" aria-hidden="true" />
            )}

            {message.content === "" && !message.thinking && (
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
