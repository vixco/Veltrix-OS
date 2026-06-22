"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { WorkMode } from "./modes";

// =================================================================
// Custom Assistants (GPTs-style)
// A reusable assistant = system prompt + knowledge files + a subset of
// enabled capabilities + optional work mode. Selected per conversation so
// a chat runs with a tailored persona and capability set.
// =================================================================

export interface AssistantKnowledge {
  filename: string;
  text: string;
}

export interface AssistantCapabilities {
  web: boolean;
  browser: boolean;
  host: boolean;
  image: boolean;
}

export const DEFAULT_ASSISTANT_CAPS: AssistantCapabilities = {
  web: true,
  browser: true,
  host: true,
  image: true,
};

export interface Assistant {
  id: string;
  name: string;
  description: string;
  emoji: string;
  systemPrompt: string;
  capabilities: AssistantCapabilities;
  knowledge: AssistantKnowledge[];
  mode?: WorkMode;
  createdAt: number;
  updatedAt: number;
}

export interface AssistantDraft {
  id?: string;
  name: string;
  description: string;
  emoji: string;
  systemPrompt: string;
  capabilities: AssistantCapabilities;
  knowledge: AssistantKnowledge[];
  mode?: WorkMode;
}

interface AssistantState {
  assistants: Assistant[];
  /** Default assistant used when starting a brand-new chat (null = Default). */
  defaultAssistantId: string | null;
  upsert: (draft: AssistantDraft) => string;
  remove: (id: string) => void;
  setDefault: (id: string | null) => void;
  get: (id: string | null | undefined) => Assistant | null;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      assistants: [],
      defaultAssistantId: null,
      upsert: (draft) => {
        const now = Date.now();
        if (draft.id && get().assistants.some((x) => x.id === draft.id)) {
          const id = draft.id;
          set((s) => ({
            assistants: s.assistants.map((x) =>
              x.id === id
                ? {
                    ...x,
                    name: draft.name,
                    description: draft.description,
                    emoji: draft.emoji,
                    systemPrompt: draft.systemPrompt,
                    capabilities: draft.capabilities,
                    knowledge: draft.knowledge,
                    mode: draft.mode,
                    updatedAt: now,
                  }
                : x
            ),
          }));
          return id;
        }
        const id = draft.id || nanoid();
        set((s) => ({
          assistants: [
            ...s.assistants,
            {
              id,
              name: draft.name,
              description: draft.description,
              emoji: draft.emoji,
              systemPrompt: draft.systemPrompt,
              capabilities: draft.capabilities,
              knowledge: draft.knowledge,
              mode: draft.mode,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return id;
      },
      remove: (id) =>
        set((s) => ({
          assistants: s.assistants.filter((x) => x.id !== id),
          defaultAssistantId: s.defaultAssistantId === id ? null : s.defaultAssistantId,
        })),
      setDefault: (id) => set({ defaultAssistantId: id }),
      get: (id) => (id ? get().assistants.find((x) => x.id === id) || null : null),
    }),
    { name: "veltrix-assistants" }
  )
);
