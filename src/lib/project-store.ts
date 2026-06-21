"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { pb } from "./pocketbase";
import { useAuthStore } from "./auth-store";

export interface Project {
  id: string;
  title: string;
  description: string;
  instructions: string;
  color: string;
  icon: string;
  conversationIds: string[];
  created: string;
  updated: string;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  create: (data: Partial<Project>) => Promise<Project>;
  update: (id: string, data: Partial<Project>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
  addConversation: (projectId: string, convId: string) => Promise<void>;
  removeConversation: (projectId: string, convId: string) => Promise<void>;
}

function isGuest(): boolean {
  return useAuthStore.getState().mode !== "cloud";
}

function mapProject(r: any): Project {
  return {
    id: r.id,
    title: r.title || "Untitled",
    description: r.description || "",
    instructions: r.instructions || "",
    color: r.color || "#c6613f",
    icon: r.icon || "folder",
    conversationIds: r.conversationIds || [],
    created: r.created,
    updated: r.updated,
  };
}

function localProject(data: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: nanoid(12),
    title: data.title || "New Project",
    description: data.description || "",
    instructions: data.instructions || "",
    color: data.color || "#c6613f",
    icon: data.icon || "folder",
    conversationIds: [],
    created: now,
    updated: now,
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      loading: false,
      loaded: false,

      load: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;
        set({ loading: true });
        try {
          if (isGuest()) {
            set({ loaded: true });
            return;
          }
          const records = await pb().collection("projects").getList(1, 100);
          const result = records.items.sort((a, b) => (b.id > a.id ? 1 : -1));
          set({ projects: result.map(mapProject), loaded: true });
        } catch (err) {
          console.error("Failed to load projects:", err);
        } finally {
          set({ loading: false });
        }
      },

      create: async (data) => {
        const user = useAuthStore.getState().user;
        if (!user) throw new Error("Not authenticated");
        if (isGuest()) {
          const project = localProject(data);
          set((state) => ({ projects: [project, ...state.projects] }));
          return project;
        }
        const record = await pb().collection("projects").create({
          user: user.id,
          title: data.title || "New Project",
          description: data.description || "",
          instructions: data.instructions || "",
          color: data.color || "#c6613f",
          icon: data.icon || "folder",
          conversationIds: [],
        });
        const project = mapProject(record);
        set((state) => ({ projects: [project, ...state.projects] }));
        return project;
      },

      update: async (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updated: new Date().toISOString() } : p
          ),
        }));
        if (isGuest()) return;
        await pb().collection("projects").update(id, {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.instructions !== undefined && { instructions: data.instructions }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.conversationIds !== undefined && { conversationIds: data.conversationIds }),
        });
      },

      remove: async (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }));
        if (isGuest()) return;
        await pb().collection("projects").delete(id);
      },

      setActive: (id) => set({ activeProjectId: id }),

      addConversation: async (projectId, convId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project || project.conversationIds.includes(convId)) return;
        const newIds = [...project.conversationIds, convId];
        await get().update(projectId, { conversationIds: newIds });
      },

      removeConversation: async (projectId, convId) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return;
        const newIds = project.conversationIds.filter((id) => id !== convId);
        await get().update(projectId, { conversationIds: newIds });
      },
    }),
    {
      name: "veltrix-projects",
      partialize: (s) => ({ projects: s.projects, activeProjectId: s.activeProjectId }),
    }
  )
);
