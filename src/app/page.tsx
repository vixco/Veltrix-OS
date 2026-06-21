"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PanelLeft, Plus, PenLine, Code2, GraduationCap, Lightbulb } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { ArtifactPanel } from "@/components/artifact-panel";
import { SettingsDialog } from "@/components/settings-dialog";
import { useChatStore, useProviderStore, type Attachment } from "@/lib/store";
import { getProvider, type ContentPart } from "@/lib/providers";
import { ARTIFACT_SYSTEM_PROMPT } from "@/lib/artifacts";
import { buildMessageContent } from "@/lib/utils";
import { ClaudeLogo } from "@/components/claude-logo";
import { AuthGuard } from "@/components/auth-guard";
import { MODES, type WorkMode } from "@/lib/modes";
import { useProjectStore } from "@/lib/project-store";
import { useAuthStore } from "@/lib/auth-store";
import { Palette, Users } from "lucide-react";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [mode, setMode] = useState<WorkMode>("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Steering (Claude/Codex-style): submits while a generation is running are
  // appended to the history but do NOT interrupt the current stream. The
  // current turn runs to completion, then a follow-up assistant turn starts
  // automatically so the model reads the interjection on its next action.
  // Cleared on abort/error so a manual stop never auto-resumes.
  const pendingTurnRef = useRef<string | null>(null);
  const startTurnRef = useRef<(convId: string) => Promise<void>>(async () => {});

  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const createConversation = useChatStore((s) => s.createConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const truncateAfter = useChatStore((s) => s.truncateAfter);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const getActiveConfig = useProviderStore((s) => s.getActiveConfig);
  const activeModel = useProviderStore((s) => s.activeModel);
  const { load: loadProjects } = useProjectStore();
  const { user, initialized: authInit, init: authInitFn } = useAuthStore();

  const activeConv = conversations.find((c) => c.id === activeId);
  const isEmpty = !activeConv || activeConv.messages.length === 0;

  useEffect(() => {
    if (!authInit) authInitFn();
  }, [authInit, authInitFn]);

  useEffect(() => {
    if (authInit && user) loadProjects();
  }, [authInit, user, loadProjects]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // Keyboard shortcuts: Esc stops generation, Cmd/Ctrl+Shift+O starts a new chat.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isStreaming) {
        abortController?.abort();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        createConversation();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStreaming, abortController, createConversation]);

  // Shared streaming core. Streams a completion into `assistantMsgId` (which must
  // already exist as an empty assistant message) using the conversation history
  // provided. Reads fresh store state so it stays correct across rapid actions.
  const streamInto = useCallback(
    async (convId: string, assistantMsgId: string, messages: { role: "system" | "user" | "assistant"; content: string | ContentPart[] }[]) => {
      setStreaming(true);
      const controller = new AbortController();
      setAbortController(controller);
      let accumulated = "";
      let thinking = "";
      let thinkingStart: number | null = null;
      let thinkingEnd: number | null = null;
      const config = getActiveConfig();
      const adapter = getProvider(config.id);
      try {
        if (!activeModel) {
          throw new Error(
            "No model selected. Open provider settings (sidebar) to pick a model, then resend."
          );
        }
        const stream = await adapter.streamCompletion(config, {
          messages,
          model: activeModel,
          temperature: 0.7,
          signal: controller.signal,
        });
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.thinking) {
            if (thinkingStart === null) thinkingStart = Date.now();
            thinking += value.thinking;
            updateMessage(convId, assistantMsgId, { thinking });
          }
          if (value?.delta) {
            if (thinkingStart !== null && thinkingEnd === null) thinkingEnd = Date.now();
            accumulated += value.delta;
            updateMessage(convId, assistantMsgId, { content: accumulated });
          }
        }
      } catch (err: any) {
        pendingTurnRef.current = null;
        if (err?.name === "AbortError") {
          updateMessage(convId, assistantMsgId, {
            content: accumulated || "Generation stopped.",
          });
        } else {
          const msg = err?.message || String(err);
          // Network/CORS failures (local server down, etc.) get a clearer hint.
          const friendly = /failed to fetch|networkerror|load failed/i.test(msg)
            ? `Could not reach the model provider (${config.label}). Check that the server is running and reachable, then try again.\n\nDetails: ${msg}`
            : `Error: ${msg}`;
          updateMessage(convId, assistantMsgId, { content: friendly, error: true });
        }
      } finally {
        if (thinkingStart !== null && thinkingEnd === null) thinkingEnd = Date.now();
        if (thinkingStart !== null && thinkingEnd !== null) {
          updateMessage(convId, assistantMsgId, {
            thinkingMs: thinkingEnd - thinkingStart,
          });
        }
        setStreaming(false);
        setAbortController(null);
        // If steering messages were queued during this turn, kick off the
        // follow-up assistant turn now (only reached on natural completion;
        // abort/error clear the ref in the catch above).
        const nextConv = pendingTurnRef.current;
        if (nextConv) {
          pendingTurnRef.current = null;
          startTurnRef.current(nextConv);
        }
      }
    },
    [activeModel, getActiveConfig, setStreaming, updateMessage]
  );

  // Build the message array for one assistant turn and stream it into a fresh
  // empty assistant message. Shared by the initial send and the steering
  // auto-continue path so behavior stays identical.
  const startAssistantTurn = useCallback(
    async (convId: string) => {
      const assistantMsgId = addMessage(convId, { role: "assistant", content: "" });
      const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
      const history = (conv?.messages || []).filter((m) => m.id !== assistantMsgId);
      const systemPrompt = ARTIFACT_SYSTEM_PROMPT + "\n\n" + MODES[mode].systemPromptExtra;
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.role === "user" ? buildMessageContent(m.content, m.attachments) : m.content })),
      ];
      await streamInto(convId, assistantMsgId, messages);
    },
    [mode, addMessage, streamInto]
  );

  useEffect(() => {
    startTurnRef.current = startAssistantTurn;
  }, [startAssistantTurn]);

  const handleSend = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      let convId = activeId;
      if (!convId) convId = createConversation();
      addMessage(convId, { role: "user", content: text, attachments });
      // While a generation is running the submit becomes steering: the message
      // is appended to history but does NOT interrupt the in-flight stream. A
      // follow-up assistant turn starts automatically once the current one
      // finishes, so the model reads the interjection on its next action.
      if (useChatStore.getState().isStreaming) {
        pendingTurnRef.current = convId;
        return;
      }
      await startAssistantTurn(convId);
    },
    [activeId, addMessage, createConversation, startAssistantTurn]
  );

  // Regenerate an assistant reply in place: re-stream from the preceding user
  // message without duplicating anything.
  const handleRegenerate = useCallback(
    async (convId: string, assistantMsgId: string) => {
      const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
      if (!conv) return;
      const idx = conv.messages.findIndex((m) => m.id === assistantMsgId);
      if (idx === -1) return;
      const history = conv.messages.slice(0, idx);
      updateMessage(convId, assistantMsgId, { content: "", thinking: "", thinkingMs: undefined, error: false });
      const systemPrompt = ARTIFACT_SYSTEM_PROMPT + "\n\n" + MODES[mode].systemPromptExtra;
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.role === "user" ? buildMessageContent(m.content, m.attachments) : m.content })),
      ];
      await streamInto(convId, assistantMsgId, messages);
    },
    [mode, streamInto, updateMessage]
  );

  // Edit a user message and resend: update text, drop everything after it, then
  // stream a fresh assistant reply.
  const handleEditUser = useCallback(
    async (convId: string, userMsgId: string, newText: string) => {
      const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
      if (!conv) return;
      updateMessage(convId, userMsgId, { content: newText });
      truncateAfter(convId, userMsgId);
      const assistantMsgId = addMessage(convId, { role: "assistant", content: "" });
      const fresh = useChatStore.getState().conversations.find((c) => c.id === convId);
      const history = (fresh?.messages || []).filter((m) => m.id !== assistantMsgId);
      const systemPrompt = ARTIFACT_SYSTEM_PROMPT + "\n\n" + MODES[mode].systemPromptExtra;
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.role === "user" ? buildMessageContent(m.content, m.attachments) : m.content })),
      ];
      await streamInto(convId, assistantMsgId, messages);
    },
    [mode, addMessage, streamInto, updateMessage, truncateAfter]
  );


  const handleStop = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  return (
    <AuthGuard>
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
                className="flex items-center gap-2 px-2.5 h-8 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90 text-[13px]"
              >
                <PanelLeft className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => createConversation()}
                className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90"
                title="New chat"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
            </header>
          )}

          {isEmpty ? (
            <div className="flex-1 flex flex-col justify-center px-4 pb-6">
              <WelcomeScreen onPick={handleSend} mode={mode} />
              <ChatInput onSend={handleSend} onStop={handleStop} mode={mode} onModeChange={setMode} />
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
                        msg.role === "assistant" && !isStreaming
                          ? () => handleRegenerate(activeConv!.id, msg.id)
                          : undefined
                      }
                      onEditUser={
                        msg.role === "user" && !isStreaming
                          ? (newText: string) => handleEditUser(activeConv!.id, msg.id, newText)
                          : undefined
                      }
                      streaming={
                        msg.role === "assistant" &&
                        isStreaming &&
                        i === activeConv!.messages.length - 1
                      }
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
              <ChatInput onSend={handleSend} onStop={handleStop} mode={mode} onModeChange={setMode} />
            </>
          )}
        </div>

        <ArtifactPanel />
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
    </AuthGuard>
  );
}

const GREETINGS = {
  morning: [
    "Good morning",
    "Morning",
    "Rise and shine",
    "Good to see you this morning",
    "Bright and early, aren't we",
  ],
  afternoon: [
    "Good afternoon",
    "Afternoon",
    "Hope your day's going well",
    "Good to see you",
    "Hey there",
  ],
  evening: [
    "Good evening",
    "Evening",
    "Hope you're winding down nicely",
    "Good to see you tonight",
    "Hey there",
  ],
  night: [
    "Burning the midnight oil",
    "Late night thoughts",
    "Up late, I see",
    "Good to see you, night owl",
    "Still going strong, huh",
  ],
};

function greeting() {
  const h = new Date().getHours();
  let bucket: keyof typeof GREETINGS;
  if (h < 5) bucket = "night";
  else if (h < 12) bucket = "morning";
  else if (h < 18) bucket = "afternoon";
  else if (h < 22) bucket = "evening";
  else bucket = "night";
  const options = GREETINGS[bucket];
  return options[Math.floor(Math.random() * options.length)];
}

const MODE_SUGGESTIONS: Record<WorkMode, { icon: typeof PenLine; title: string; prompt: string }[]> = {
  chat: [
    { icon: PenLine, title: "Write", prompt: "Help me write a warm, professional email to my team announcing a project kickoff." },
    { icon: Code2, title: "Code", prompt: "Write a TypeScript function that debounces an async function and explain how it works." },
    { icon: GraduationCap, title: "Learn", prompt: "Explain how transformers work in machine learning, in simple terms." },
    { icon: Lightbulb, title: "Brainstorm", prompt: "Brainstorm 10 creative names for a coffee shop focused on remote workers." },
  ],
  code: [
    { icon: Code2, title: "HTML App", prompt: "Build a beautiful calculator app in a single HTML file with modern CSS." },
    { icon: Code2, title: "React Component", prompt: "Create a React todo list component with add, delete, and complete functionality." },
    { icon: Code2, title: "API Client", prompt: "Write a JavaScript fetch wrapper with retry logic and error handling." },
    { icon: Code2, title: "Data Viz", prompt: "Create an animated bar chart using HTML canvas and vanilla JavaScript." },
  ],
  design: [
    { icon: Palette, title: "Landing Page", prompt: "Design a modern SaaS landing page with a hero section, features grid, and pricing table." },
    { icon: Palette, title: "Dashboard", prompt: "Design a clean analytics dashboard UI with sidebar navigation and stat cards." },
    { icon: Palette, title: "Mobile App", prompt: "Design a mobile fitness app UI mockup with activity tracking and progress charts." },
    { icon: Palette, title: "Logo", prompt: "Create a minimalist logo design for a tech startup using SVG." },
  ],
  cowork: [
    { icon: Users, title: "Team Doc", prompt: "Create a project kickoff document for a new SaaS product with team roles and timeline." },
    { icon: Users, title: "Review Doc", prompt: "Write a code review checklist for a TypeScript React pull request." },
    { icon: Users, title: "Architecture", prompt: "Create a system architecture diagram for a microservices-based web application." },
    { icon: Users, title: "Sprint Plan", prompt: "Create a 2-week sprint plan with user stories and acceptance criteria for a todo app." },
  ],
};

const SUGGESTIONS = MODE_SUGGESTIONS.chat;

function WelcomeScreen({ onPick, mode }: { onPick: (text: string) => void; mode: WorkMode }) {
  return (
    <div className="mx-auto w-full max-w-[768px] flex flex-col items-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 animate-bounce-in">
        <ClaudeLogo className="h-8 w-8 text-accent" />
      </div>
      <h1 suppressHydrationWarning className="font-serif text-[34px] sm:text-[40px] leading-tight font-normal text-foreground animate-slide-up">
        {greeting()}
      </h1>
      <p className="mt-2 text-[15px] text-muted-fg animate-slide-up" style={{ animationDelay: "0.08s" }}>{MODES[mode].description}</p>

      <div className="mt-7 grid grid-cols-2 gap-2.5 w-full">
        {MODE_SUGGESTIONS[mode].map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={() => onPick(s.prompt)}
              style={{ ["--i" as any]: i + 2 }}
              className="group lift animate-stagger-in flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-border bg-surface/60 hover:bg-surface-2 hover:border-border-hover hover:shadow-md text-left"
            >
              <Icon className="h-4 w-4 text-accent shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-[13px] font-medium text-foreground">{s.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
