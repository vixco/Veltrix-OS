"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ModelSelector } from "@/components/model-selector";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ArtifactPanel } from "@/components/artifact-panel";
import { SettingsDialog } from "@/components/settings-dialog";
import { useChatStore, useProviderStore } from "@/lib/store";
import { getProvider } from "@/lib/providers";
import { ARTIFACT_SYSTEM_PROMPT } from "@/lib/artifacts";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const createConversation = useChatStore((s) => s.createConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const getActiveConfig = useProviderStore((s) => s.getActiveConfig);
  const activeProvider = useProviderStore((s) => s.activeProvider);
  const activeModel = useProviderStore((s) => s.activeModel);

  const activeConv = conversations.find((c) => c.id === activeId);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleSend = useCallback(async (text: string) => {
    let convId = activeId;
    if (!convId) {
      convId = createConversation();
    }

    // Add user message
    addMessage(convId, { role: "user", content: text });

    // Add empty assistant message
    const assistantMsgId = addMessage(convId, { role: "assistant", content: "" });

    setStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const config = getActiveConfig();
      const adapter = getProvider(config.id);

      const messages = [
        { role: "system" as const, content: ARTIFACT_SYSTEM_PROMPT },
        ...(activeConv?.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
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
        updateMessage(convId, assistantMsgId, {
          content: "Generation stopped.",
        });
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
  }, [activeId, activeConv, activeModel, getActiveConfig, addMessage, createConversation, setStreaming, updateMessage]);

  const handleStop = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Main area */}
      <div className="flex-1 flex min-w-0">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
            <ModelSelector />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-fg">
                {activeConv ? `${activeConv.messages.length} messages` : ""}
              </span>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {!activeConv || activeConv.messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="py-4">
                {activeConv.messages.map((msg, i) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    convId={activeConv.id}
                    onRegenerate={
                      msg.role === "assistant" && i > 0
                        ? () => {
                            const prevMsg = activeConv.messages[i - 1];
                            if (prevMsg && prevMsg.role === "user") {
                              updateMessage(activeConv.id, msg.id, { content: "" });
                              handleSend(prevMsg.content);
                            }
                          }
                        : undefined
                    }
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} onStop={handleStop} />
        </div>

        {/* Artifact panel */}
        <ArtifactPanel />
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function EmptyState() {
  const examples = [
    { icon: "📋", title: "Make a plan", desc: "Create a structured plan" },
    { icon: "📊", title: "Compare options", desc: "Side-by-side comparison" },
    { icon: "🎨", title: "Build a UI", desc: "Generate HTML component" },
    { icon: "📅", title: "Schedule", desc: "Plan a timeline" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center mb-6 glow-accent">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
        Welcome to <span className="gradient-text">Veltrix OS</span>
      </h1>
      <p className="text-muted-fg text-[15px] mb-10 max-w-md text-center">
        Your AI operating system. Ask anything, or request an artifact — a plan, document, comparison, or code.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
        {examples.map((ex) => (
          <div
            key={ex.title}
            className="flex items-start gap-3 p-4 rounded-xl bg-surface-2 border border-border hover:border-border-hover transition-colors cursor-pointer"
          >
            <span className="text-xl">{ex.icon}</span>
            <div>
              <p className="text-sm font-medium text-foreground">{ex.title}</p>
              <p className="text-xs text-muted-fg">{ex.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}