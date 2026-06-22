"use client";

import { useChatStore } from "./store";
import { useAssistantStore } from "./assistant-store";
import { useMemoryStore } from "./memory-store";
import { usePreferences } from "./preferences";
import { useProjectStore } from "./project-store";

/** Export all local user data (chats, assistants, projects, memory, preferences)
 *  as a single JSON file for backup / portability. */
export function exportAllData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "veltrix-os",
    version: 1,
    conversations: useChatStore.getState().conversations,
    assistants: useAssistantStore.getState().assistants,
    projects: useProjectStore.getState().projects,
    memory: useMemoryStore.getState(),
    preferences: usePreferences.getState(),
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `veltrix-export-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
