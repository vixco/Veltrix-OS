"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PanelLeft, Plus, PenLine, Code2, GraduationCap, Lightbulb } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ArtifactPanel } from "@/components/artifact-panel";
import { SettingsDialog } from "@/components/settings-dialog";
import { useChatStore, useProviderStore } from "@/lib/store";
import { getProvider } from "@/lib/providers";
import { ARTIFACT_SYSTEM_PROMPT } from "@/lib/artifacts";
import { ClaudeLogo } from "@/components/claude-logo";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const createConversation = useChatStore((s) => s.createConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const getActiveConfig = useProviderStore((s) => s.getActiveConfig);
  const activeModel = useProviderStore((s) => s.activeModel);

  const activeConv = conversations.find((c) => c.id === activeId);
  const isEmpty = !activeConv || activeConv.messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleSend = useCallback(
    async (text: string) => {
      let convId = activeId;
      if (!convId) convId = createConversation();

      addMessage(convId, { role: "user", content: text });
      const assistantMsgId = addMessage(convId, { role: "assistant", content: "" });
      setStreaming(true);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        const config = getActiveConfig();
        const adapter = getProvider(config.id);

        const messages = [
          { role: "system" as const, content: ARTIFACT_SYSTEM_PROMPT },
          ...(activeConv?.messages || []).map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: text },
        ];

        const stream = await adapter.streamCompletion(config, {
          messages,
          model: activeModel,
          temperature: 0.7,
          signal: controller.signal,
        });

        const reader = stream.getReader();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.delta) {
            accumulated += value.delta;
            updateMessage(convId, assistantMsgId, { content: accumulated });
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          updateMessage(convId, assistantMsgId, { content: "Generation stopped." });
        } else {
          updateMessage(convId, assistantMsgId, {
            content: `Error: ${err.message}`,
            error: true,
          });
        }
      } finally {
        setStreaming(false);
        setAbortController(null);
      }
    },
    [activeId, activeConv, activeModel, getActiveConfig, addMessage, createConversation, setStreaming, updateMessage]
  );

  const handleStop = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex min-w-0">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          {sidebarCollapsed && (
            <header className="flex items-center justify-between px-3 h-12 shrink-0">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="flex items-center gap-2 px-2.5 h-8 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors text-[13px]"
              >
                <PanelLeft className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => createConversation()}
                className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
                title="New chat"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
            </header>
          )}

          {isEmpty ? (
            <div className="flex-1 flex flex-col justify-center px-4 pb-6">
              <WelcomeScreen onPick={handleSend} />
              <ChatInput onSend={handleSend} onStop={handleStop} />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="py-4">
                  {activeConv!.messages.map((msg, i) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      convId={activeConv!.id}
                      onRegenerate={
                        msg.role === "assistant" && i > 0
                          ? () => {
                              const prevMsg = activeConv!.messages[i - 1];
                              if (prevMsg && prevMsg.role === "user") {
                                updateMessage(activeConv!.id, msg.id, { content: "" });
                                handleSend(prevMsg.content);
                              }
                            }
                          : undefined
                      }
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
              <ChatInput onSend={handleSend} onStop={handleStop} />
            </>
          )}
        </div>

        <ArtifactPanel />
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const SUGGESTIONS = [
  {
    icon: PenLine,
    title: "Write",
    prompt: "Help me write a warm, professional email to my team announcing a project kickoff.",
  },
  {
    icon: Code2,
    title: "Code",
    prompt: "Write a TypeScript function that debounces an async function and explain how it works.",
  },
  {
    icon: GraduationCap,
    title: "Learn",
    prompt: "Explain how transformers work in machine learning, in simple terms.",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm",
    prompt: "Brainstorm 10 creative names for a coffee shop focused on remote workers.",
  },
];

function WelcomeScreen({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-[768px] flex flex-col items-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
        <ClaudeLogo className="h-8 w-8 text-accent" />
      </div>
      <h1 suppressHydrationWarning className="font-serif text-[34px] sm:text-[40px] leading-tight font-normal text-foreground">
        {greeting()}
      </h1>
      <p className="mt-2 text-[15px] text-muted-fg">How can I help you today?</p>

      <div className="mt-7 grid grid-cols-2 gap-2.5 w-full">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={() => onPick(s.prompt)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-border bg-surface/60 hover:bg-surface-2 hover:border-border-hover transition-colors text-left"
            >
              <Icon className="h-4 w-4 text-accent shrink-0" />
              <span className="text-[13px] font-medium text-foreground">{s.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
