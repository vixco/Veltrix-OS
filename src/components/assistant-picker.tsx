"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useAssistantStore } from "@/lib/assistant-store";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function AssistantPicker() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const setConversationAssistant = useChatStore((s) => s.setConversationAssistant);
  const assistants = useAssistantStore((s) => s.assistants);
  const defaultAssistantId = useAssistantStore((s) => s.defaultAssistantId);
  const getAssistant = useAssistantStore((s) => s.get);

  const conv = conversations.find((c) => c.id === activeId) || null;
  // Per-chat chosen assistant, else fall back to the global default.
  const effectiveId = conv?.assistantId ?? defaultAssistantId;
  const current = effectiveId ? getAssistant(effectiveId) : null;

  const choose = (id: string | null) => {
    if (conv) setConversationAssistant(conv.id, id);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="px-3 pb-2">
        <Popover.Trigger asChild>
          <button
            className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[12.5px] font-medium text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-[0.98] border border-border/60"
            title="Choose assistant for this chat"
          >
            <span className="text-base leading-none">{current ? current.emoji : "⚙️"}</span>
            <span className="flex-1 min-w-0 text-left truncate">{current ? current.name : "Default"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-fg/70" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[260px] rounded-xl border border-border bg-surface shadow-lg p-1.5 animate-slide-up"
          >
            <button
              onClick={() => choose(null)}
              className={cn("w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-colors", !current ? "bg-accent/10 text-foreground" : "text-muted-fg hover:text-foreground hover:bg-surface-2")}
            >
              <span className="text-base leading-none">⚙️</span>
              <span className="flex-1 text-left truncate">Default</span>
              {!current && <Check className="h-3.5 w-3.5 text-accent" />}
            </button>
            {assistants.length > 0 && <div className="h-px bg-border my-1" />}
            <div className="max-h-[280px] overflow-y-auto">
              {assistants.map((a) => (
                <button
                  key={a.id}
                  onClick={() => choose(a.id)}
                  className={cn("w-full flex items-center gap-2.5 px-2.5 h-10 rounded-lg text-[13px] transition-colors", current?.id === a.id ? "bg-accent/10 text-foreground" : "text-muted-fg hover:text-foreground hover:bg-surface-2")}
                >
                  <span className="text-base leading-none">{a.emoji}</span>
                  <span className="flex-1 text-left min-w-0">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block text-[11px] text-muted-fg/70 truncate">{a.description || "No description"}</span>
                  </span>
                  {current?.id === a.id && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                </button>
              ))}
            </div>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { setOpen(false); router.push("/assistants"); }}
              className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[12.5px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Manage assistants
            </button>
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}
