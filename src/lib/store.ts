"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ProviderConfig, ProviderId, ModelInfo } from "./providers";
import { PROVIDERS } from "./providers";

// ═══════════════════════════════════════════════
// Provider Store
// ═══════════════════════════════════════════════

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ProviderState {
  providers: Record<ProviderId, ProviderConfig>;
  activeProvider: ProviderId;
  activeModel: string;
  /** Models discovered live from the provider server. */
  discoveredModels: Partial<Record<ProviderId, ModelInfo[]>>;
  connectionStatus: Partial<Record<ProviderId, ConnectionStatus>>;
  connectionError: Partial<Record<ProviderId, string>>;
  setProvider: (id: ProviderId) => void;
  setModel: (model: string) => void;
  updateProvider: (id: ProviderId, config: Partial<ProviderConfig>) => void;
  refreshModels: (id: ProviderId) => Promise<void>;
  getActiveConfig: () => ProviderConfig;
  /** Resolve the model list shown in the UI: discovered (live) wins, else static catalog. */
  getModels: (id: ProviderId) => ModelInfo[];
}

const defaultProviders: Record<ProviderId, ProviderConfig> = {
  openai: { id: "openai", label: "OpenAI", enabled: false, apiKey: "", baseUrl: "" },
  anthropic: { id: "anthropic", label: "Anthropic", enabled: false, apiKey: "", baseUrl: "" },
  openrouter: { id: "openrouter", label: "OpenRouter", enabled: false, apiKey: "", baseUrl: "" },
  ollama: { id: "ollama", label: "Ollama", enabled: true, apiKey: "", baseUrl: "http://localhost:11434" },
  lmstudio: { id: "lmstudio", label: "LM Studio", enabled: false, apiKey: "", baseUrl: "http://localhost:1234/v1" },
  "openai-compatible": { id: "openai-compatible", label: "Custom", enabled: false, apiKey: "", baseUrl: "" },
};

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: defaultProviders,
      activeProvider: "ollama",
      activeModel: "",
      discoveredModels: {},
      connectionStatus: {},
      connectionError: {},
      setProvider: (id) => {
        const models = get().getModels(id);
        const state = get();
        // keep current model if still valid for the new provider, else first available
        const keep = state.activeModel && models.some((m) => m.id === state.activeModel);
        set({ activeProvider: id, activeModel: keep ? state.activeModel : models[0]?.id || "" });
      },
      setModel: (model) => set({ activeModel: model }),
      updateProvider: (id, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], ...config },
          },
        })),
      refreshModels: async (id) => {
        const adapter = PROVIDERS[id];
        if (!adapter?.fetchModels) {
          set((state) => ({
            connectionStatus: { ...state.connectionStatus, [id]: "connected" },
            connectionError: { ...state.connectionError, [id]: undefined },
          }));
          return;
        }
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [id]: "connecting" },
          connectionError: { ...state.connectionError, [id]: undefined },
        }));
        try {
          const config = get().providers[id];
          const models = await adapter.fetchModels(config);
          set((state) => {
            const patch: Partial<Record<ProviderId, ModelInfo[]>> = { [id]: models };
            const next: any = {
              discoveredModels: { ...state.discoveredModels, ...patch },
              connectionStatus: { ...state.connectionStatus, [id]: "connected" },
              connectionError: { ...state.connectionError, [id]: undefined },
            };
            // if the active provider is this one and the active model no longer
            // exists in the real list, snap to the first real model.
            if (state.activeProvider === id) {
              const valid = state.activeModel && models.some((m) => m.id === state.activeModel);
              next.activeModel = valid ? state.activeModel : models[0]?.id || "";
            }
            return next;
          });
        } catch (err: any) {
          set((state) => ({
            connectionStatus: { ...state.connectionStatus, [id]: "error" },
            connectionError: { ...state.connectionError, [id]: err?.message || "Connection failed" },
            // clear stale discovered list so we never show fake/mock data
            discoveredModels: { ...state.discoveredModels, [id]: [] },
          }));
        }
      },
      getModels: (id) => {
        const state = get();
        const discovered = state.discoveredModels[id];
        if (discovered && discovered.length > 0) return discovered;
        return PROVIDERS[id]?.models || [];
      },
      getActiveConfig: () => {
        const state = get();
        return state.providers[state.activeProvider];
      },
    }),
    {
      name: "veltrix-providers",
      partialize: (state) => ({
        providers: state.providers,
        activeProvider: state.activeProvider,
        activeModel: state.activeModel,
        discoveredModels: state.discoveredModels,
      }),
    }
  )
);

// ═══════════════════════════════════════════════
// Chat Store
// ═══════════════════════════════════════════════

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Text content for text-readable files (inlined into the prompt). */
  text?: string;
  /** Data URL for images / binary previews (display only). */
  dataUrl?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  artifactId?: string;
  artifactIds?: string[];
  editing?: boolean;
  error?: boolean;
  attachments?: Attachment[];
  /** Model reasoning/thinking shown in a collapsible block above the answer. */
  thinking?: string;
  /** Wall-clock duration of the thinking phase, in ms. */
  thinkingMs?: number;
  /** Provider stop reason ("length" / "max_tokens" = truncated, allows "Continue generating"). */
  finishReason?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  provider: ProviderId;
  model: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  /** Custom assistant (GPT) applied to this chat, if any. */
  assistantId?: string;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  isStreaming: boolean;
  // actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActive: (id: string) => void;
  addMessage: (convId: string, msg: Omit<Message, "id" | "createdAt">) => string;
  updateMessage: (convId: string, msgId: string, updates: Partial<Message>) => void;
  deleteMessage: (convId: string, msgId: string) => void;
  truncateAfter: (convId: string, msgId: string) => void;
  setStreaming: (v: boolean) => void;
  renameConversation: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  setConversationAssistant: (id: string, assistantId: string | null) => void;
  getActive: () => Conversation | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      isStreaming: false,
      createConversation: () => {
        // If the active conversation is still empty, reuse it instead of
        // spawning another blank chat (prevents "new chat" spam).
        const state = get();
        const active = state.activeId
          ? state.conversations.find((c) => c.id === state.activeId)
          : null;
        if (active && active.messages.length === 0) {
          return active.id;
        }

        const id = nanoid();
        const now = Date.now();
        const conv: Conversation = {
          id,
          title: "New chat",
          messages: [],
          provider: useProviderStore.getState().activeProvider,
          model: useProviderStore.getState().activeModel,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeId: id,
        }));
        return id;
      },
      deleteConversation: (id) =>
        set((state) => {
          const remaining = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: remaining,
            activeId: state.activeId === id ? remaining[0]?.id || null : state.activeId,
          };
        }),
      setActive: (id) => set({ activeId: id }),
      addMessage: (convId, msg) => {
        const msgId = nanoid();
        const now = Date.now();
        const fullMsg: Message = { ...msg, id: msgId, createdAt: now };
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, fullMsg],
                  updatedAt: now,
                  title: c.messages.length === 0 && msg.role === "user"
                    ? msg.content.slice(0, 40) || "New chat"
                    : c.title,
                }
              : c
          ),
        }));
        return msgId;
      },
      updateMessage: (convId, msgId, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === msgId ? { ...m, ...updates } : m
                  ),
                }
              : c
          ),
        })),
      deleteMessage: (convId, msgId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.filter((m) => m.id !== msgId) }
              : c
          ),
        })),
      truncateAfter: (convId, msgId) =>
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== convId) return c;
            const idx = c.messages.findIndex((m) => m.id === msgId);
            if (idx === -1) return c;
            // keep everything up to and including msgId
            return { ...c, messages: c.messages.slice(0, idx + 1) };
          }),
        })),
      setStreaming: (v) => set({ isStreaming: v }),
      renameConversation: (id, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        })),
      togglePin: (id) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c
          ),
        })),
      setConversationAssistant: (id, assistantId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, assistantId: assistantId || undefined } : c
          ),
        })),
      getActive: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeId) || null;
      },
    }),
    {
      name: "veltrix-chats",
      // Never persist isStreaming: a previous turn that was
      // interrupted by a reload would otherwise leave the store stuck in
      // streaming mode, which makes every new send fall into the steering
      // branch and never start an assistant turn.
      partialize: (state) => ({
        conversations: state.conversations,
        activeId: state.activeId,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...((persisted as Partial<ChatState>) || {}),
        isStreaming: false,
      }),
    }
  )
);

// ═══════════════════════════════════════════════
// Artifact Store
// ═══════════════════════════════════════════════

import type { Artifact } from "./artifacts";

interface ArtifactState {
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  panelOpen: boolean;
  setArtifact: (art: Artifact) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  openPanel: (artifactId: string) => void;
  closePanel: () => void;
  getActive: () => Artifact | null;
}

export const useArtifactStore = create<ArtifactState>()(
  persist(
    (set, get) => ({
      artifacts: {},
      activeArtifactId: null,
      panelOpen: false,
      setArtifact: (art) =>
        set((state) => ({
          artifacts: { ...state.artifacts, [art.id]: art },
        })),
      updateArtifact: (id, updates) =>
        set((state) => ({
          artifacts: {
            ...state.artifacts,
            [id]: { ...state.artifacts[id], ...updates, updatedAt: Date.now() },
          },
        })),
      openPanel: (artifactId) => set({ activeArtifactId: artifactId, panelOpen: true }),
      closePanel: () => set({ panelOpen: false, activeArtifactId: null }),
      getActive: () => {
        const state = get();
        return state.activeArtifactId ? state.artifacts[state.activeArtifactId] : null;
      },
    }),
    { name: "veltrix-artifacts" }
  )
);