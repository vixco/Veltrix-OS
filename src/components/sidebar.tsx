"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, Settings, Sparkles, X } from "lucide-react";
import { useChatStore, useProviderStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/scroll-area";

export function Sidebar({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const createConversation = useChatStore((s) => s.createConversation);
  const setActive = useChatStore((s) => s.setActive);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const activeProvider = useProviderStore((s) => s.activeProvider);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <aside className="flex h-full w-[260px] flex-col bg-surface border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Veltrix</span>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <Button
          variant="secondary"
          className="w-full justify-start gap-2"
          onClick={() => createConversation()}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-fg">No conversations yet</p>
            <p className="text-xs text-muted-fg/60 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onMouseEnter={() => setHoverId(conv.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => setActive(conv.id)}
                className={cn(
                  "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  activeId === conv.id
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-fg hover:text-foreground hover:bg-surface-2/50"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {conv.title}
                  </p>
                  <p className="text-[11px] text-muted-fg/60">
                    {timeAgo(conv.updatedAt)}
                  </p>
                </div>
                {hoverId === conv.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          Provider Settings
        </Button>
      </div>
    </aside>
  );
}