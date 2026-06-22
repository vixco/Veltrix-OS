"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// =================================================================
// Central preferences store
// Backs every settings panel section. Persisted to localStorage.
// =================================================================

export type ThemePresetId = "feltrix-original" | "feltrix-black";
export type ColorMode = "light" | "dark" | "system";
export type MotionMode = "system" | "reduced";
export type ChatFont = "sans" | "serif" | "mono";
export type StyleId = "buttery" | "professional" | "chill" | "concise" | "playful";
export type LanguageId =
  | "en-US"
  | "fr-FR"
  | "de-DE"
  | "hi-IN"
  | "id-ID"
  | "it-IT"
  | "zh-CN"
  | "zh-TW"
  | "pt-PT"
  | "es-LATAM"
  | "es-ES";

export interface AvatarConfig {
  /** Deterministic seed so the avatar stays stable until rerolled. */
  seed: string;
  /** One of the local generator styles. */
  style: "bottts" | "shapes" | "rings" | "identicon" | "blocks";
  /** Foreground + background color tokens (hex). */
  fg: string;
  bg: string;
}

export interface ProfilePrefs {
  fullName: string;
  /** "What should Veltrix call you" — short display name. */
  displayName: string;
  /** "What best describes your work". */
  workDescription: string;
  /** Free-form custom instructions injected into the system prompt. */
  instructions: string;
  avatar: AvatarConfig;
}

export interface AppearancePrefs {
  themePreset: ThemePresetId;
  colorMode: ColorMode;
  chatFont: ChatFont;
  chatFontSize: number; // px, 13-18
  style: StyleId;
}

export interface NotificationPrefs {
  /** Toast in the bottom-right when a response completes. */
  responseCompletions: boolean;
  /** Also use the browser Notification API when permitted. */
  desktopNotifications: boolean;
  /** Play a subtle sound on completion. */
  sound: boolean;
}

export interface PrivacyPrefs {
  /** Attach coarse location metadata to messages/memories. */
  locationMetadata: boolean;
  /** Allow sharing chats via public links. */
  sharedChats: boolean;
  /** Last captured coarse location (city-level string). */
  lastLocation?: string;
}

export interface MemoryPrefs {
  /** Generate memories from chat history automatically (default on). */
  generateFromChat: boolean;
  /** Use memory context when building prompts. */
  useContext: boolean;
  /** Auto-consolidate / promote strong memories. */
  autoConsolidate: boolean;
}

export interface ModelCapabilityPrefs {
  artifacts: boolean;
  aiPoweredArtifacts: boolean;
  codeExecution: boolean;
  allowNetwork: boolean;
  /** Allow Veltrix to reach the internet via the host (web search + fetch, no API key). */
  webAccess: boolean;
  /** Allow Veltrix to run shell commands and read/write files on the host machine. */
  hostAccess: boolean;
  /** Allow Veltrix to drive a real headless Chromium browser live (navigate, click, type, screenshot). */
  browserAccess: boolean;
  /** Provider used when no explicit per-chat provider is chosen. */
  defaultProvider: string;
  defaultModel: string;
  /** Extended thinking control: "auto" = per-model default, "on" = force on, "off" = force off (saves tokens). */
  thinkingMode: "auto" | "on" | "off";
  /** Thinking budget in tokens for Anthropic extended thinking. */
  thinkingBudget: number;
  /** Sampling temperature (0-2). Applied to all providers that support it. */
  temperature: number;
  /** Max output tokens per response (0 = provider default / auto). */
  maxTokens: number;
}

export interface ToolInstall {
  id: string;
  enabled: boolean;
  installedAt: number;
}

interface PreferencesState {
  profile: ProfilePrefs;
  appearance: AppearancePrefs;
  motion: MotionMode;
  language: LanguageId;
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  memory: MemoryPrefs;
  capabilities: ModelCapabilityPrefs;
  tools: ToolInstall[];
  // actions
  setProfile: (p: Partial<ProfilePrefs>) => void;
  setAvatar: (a: Partial<AvatarConfig>) => void;
  rerollAvatar: () => void;
  setAppearance: (a: Partial<AppearancePrefs>) => void;
  setMotion: (m: MotionMode) => void;
  setLanguage: (l: LanguageId) => void;
  setNotifications: (n: Partial<NotificationPrefs>) => void;
  setPrivacy: (p: Partial<PrivacyPrefs>) => void;
  setMemory: (m: Partial<MemoryPrefs>) => void;
  setCapabilities: (c: Partial<ModelCapabilityPrefs>) => void;
  setToolEnabled: (id: string, enabled: boolean) => void;
  resetAll: () => void;
  onboardingCompleted: boolean;
  workspacePath: string;
  ollamaPath: string;
  ultraAgentOsMode: boolean;
  composioApiKey: string;
  setOnboardingCompleted: (completed: boolean) => void;
  setWorkspacePath: (path: string) => void;
  setOllamaPath: (path: string) => void;
  setUltraAgentOsMode: (enabled: boolean) => void;
  setComposioApiKey: (key: string) => void;
}

const AVATAR_STYLES: AvatarConfig["style"][] = ["bottts", "shapes", "rings", "identicon", "blocks"];
const PALETTE = [
  { fg: "#ffffff", bg: "#c6613f" },
  { fg: "#ffffff", bg: "#6366f1" },
  { fg: "#1f2937", bg: "#f59e0b" },
  { fg: "#ffffff", bg: "#0ea5e9" },
  { fg: "#ffffff", bg: "#10b981" },
  { fg: "#ffffff", bg: "#ec4899" },
  { fg: "#0f172a", bg: "#e2e8f0" },
  { fg: "#ffffff", bg: "#8b5cf6" },
  { fg: "#ffffff", bg: "#ef4444" },
  { fg: "#0f172a", bg: "#fbbf24" },
];

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeAvatar(): AvatarConfig {
  const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return { seed: randomSeed(), style, fg: c.fg, bg: c.bg };
}

const defaultProfile: ProfilePrefs = {
  fullName: "",
  displayName: "",
  workDescription: "",
  instructions: "",
  avatar: makeAvatar(),
};

const defaultAppearance: AppearancePrefs = {
  themePreset: "feltrix-original",
  colorMode: "light",
  chatFont: "sans",
  chatFontSize: 15,
  style: "buttery",
};

export const usePreferences = create<PreferencesState>()(
  persist<PreferencesState>(
    (set) => ({
      profile: defaultProfile,
      appearance: defaultAppearance,
      motion: "system",
      language: "en-US",
      notifications: { responseCompletions: true, desktopNotifications: false, sound: false },
      privacy: { locationMetadata: false, sharedChats: true },
      memory: { generateFromChat: true, useContext: true, autoConsolidate: true },
      capabilities: {
        artifacts: true,
        aiPoweredArtifacts: true,
        codeExecution: true,
        allowNetwork: false,
        webAccess: true,
        hostAccess: true,
        browserAccess: true,
        defaultProvider: "ollama",
        defaultModel: "",
        thinkingMode: "auto",
        thinkingBudget: 4000,
        temperature: 0.7,
        maxTokens: 0,
      },
      tools: [],
      onboardingCompleted: false,
      workspacePath: "",
      ollamaPath: "",
      ultraAgentOsMode: false,
      composioApiKey: "",

      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setWorkspacePath: (path) => set({ workspacePath: path }),
      setOllamaPath: (path) => set({ ollamaPath: path }),
      setUltraAgentOsMode: (enabled) => set({ ultraAgentOsMode: enabled }),
      setComposioApiKey: (key) => set({ composioApiKey: key }),

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setAvatar: (a) => set((s) => ({ profile: { ...s.profile, avatar: { ...s.profile.avatar, ...a } } })),
      rerollAvatar: () => set((s) => ({ profile: { ...s.profile, avatar: makeAvatar() } })),
      setAppearance: (a) => set((s) => ({ appearance: { ...s.appearance, ...a } })),
      setMotion: (m) => set({ motion: m }),
      setLanguage: (l) => set({ language: l }),
      setNotifications: (n) => set((s) => ({ notifications: { ...s.notifications, ...n } })),
      setPrivacy: (p) => set((s) => ({ privacy: { ...s.privacy, ...p } })),
      setMemory: (m) => set((s) => ({ memory: { ...s.memory, ...m } })),
      setCapabilities: (c) => set((s) => ({ capabilities: { ...s.capabilities, ...c } })),
      setToolEnabled: (id, enabled) =>
        set((s) => {
          const existing = s.tools.find((t) => t.id === id);
          if (existing) {
            return { tools: s.tools.map((t) => (t.id === id ? { ...t, enabled } : t)) };
          }
          return { tools: [...s.tools, { id, enabled, installedAt: Date.now() }] };
        }),
      resetAll: () =>
        set({
          profile: defaultProfile,
          appearance: defaultAppearance,
          motion: "system",
          language: "en-US",
          notifications: { responseCompletions: true, desktopNotifications: false, sound: false },
          privacy: { locationMetadata: false, sharedChats: true },
          memory: { generateFromChat: true, useContext: true, autoConsolidate: true },
          capabilities: {
            artifacts: true,
            aiPoweredArtifacts: true,
            codeExecution: true,
            allowNetwork: false,
            webAccess: true,
            hostAccess: true,
            browserAccess: true,
            defaultProvider: "ollama",
            defaultModel: "",
            thinkingMode: "auto",
            thinkingBudget: 4000,
            temperature: 0.7,
            maxTokens: 0,
          },
          tools: [],
          onboardingCompleted: false,
          workspacePath: "",
          ollamaPath: "",
          ultraAgentOsMode: false,
          composioApiKey: "",
        }),
    }),
    {
      name: "veltrix-preferences",
      merge: (persistedState: any, currentState: PreferencesState): PreferencesState => {
        if (!persistedState) return currentState;
        return {
          ...currentState,
          ...persistedState,
          capabilities: {
            ...currentState.capabilities,
            ...persistedState.capabilities,
          },
          profile: {
            ...currentState.profile,
            ...persistedState.profile,
          },
          appearance: {
            ...currentState.appearance,
            ...persistedState.appearance,
          },
          notifications: {
            ...currentState.notifications,
            ...persistedState.notifications,
          },
          privacy: {
            ...currentState.privacy,
            ...persistedState.privacy,
          },
          memory: {
            ...currentState.memory,
            ...persistedState.memory,
          },
        };
      }
    }
  )
);

/** Derived first name for the bottom-left user button (Claude-style). */
export function firstName(p: ProfilePrefs): string {
  const base = (p.displayName || p.fullName || "Guest").trim();
  return base.split(/\s+/)[0] || "Guest";
}
