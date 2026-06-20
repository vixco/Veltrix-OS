"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ProviderConfig, ProviderId, ModelInfo } from "./providers";
import { PROVIDERS } from "./providers";

// ═══════════════════════════════════════════════
// Provider Store
// ═══════════════════════════════════════════════

interface ProviderState {
  providers: Record<ProviderId, ProviderConfig>;
  activeProvider: ProviderId;
  activeModel: string;
  setProvider: (id: ProviderId) => void;
  setModel: (model: string) => void;
  updateProvider: (id: ProviderId, config: Partial<ProviderConfig>) => void;
  getActiveConfig: () => ProviderConfig;
}

const defaultProviders: Record<ProviderId, ProviderConfig> = {
  openai: { id: "openai", label: "OpenAI", enabled: false, apiKey: "", baseUrl: "" },
  anthropic: { id: "anthropic", label: "Anthropic", enabled: false, apiKey: "", baseUrl: "" },
  openrouter: { id: "openrouter", label: "OpenRouter", enabled: false, apiKey: "", baseUrl: "" },
  ollama: { id: "ollama", label: "Ollama", enabled: true, baseUrl: "http://localhost:11434" },
  lmstudio: { id: "lmstudio", label: "LM Studio", enabled: false, baseUrl: "http://localhost:1234/v1" },
  "openai-compatible": { id: "openai-compatible", label: "Custom", enabled: false, apiKey: "", baseUrl: "" },
};

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: defaultProviders,
      activeProvider: "ollama",
      activeModel: "llama3.3",
      setProvider: (id) => {
        const models = PROVIDERS[id].models;
        set({ activeProvider: id, activeModel: models[0]?.id || "" });
      },
      setModel: (model) => set({ activeModel: model }),
      updateProvider: (id, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], ...config },
          },
        })),
      getActiveConfig: () => {
        const state = get();
        return state.providers[state.activeProvider];
      },
    }),
    { name: "veltrix-providers" }
  )
);

// ═══════════════════════════════════════════════
// Chat Store
// ═══════════════════════════════════════════════

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  artifactId?: string;
  editing?: boolean;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  provider: ProviderId;
  model: string;
  createdAt: number;
  updatedAt: number;
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
  setStreaming: (v: boolean) => void;
  renameConversation: (id: string, title: string) => void;
  getActive: () => Conversation | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      isStreaming: false,
      createConversation: () => {
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
        set((state) => ({
          conversations: [conv, ...state.conversations],
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
      setStreaming: (v) => set({ isStreaming: v }),
      renameConversation: (id, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        })),
      getActive: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeId) || null;
      },
    }),
    { name: "veltrix-chats" }
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