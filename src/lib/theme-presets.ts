"use client";

import type { ThemePresetId } from "./preferences";

export interface ThemePresetMeta {
  id: ThemePresetId;
  label: string;
  description: string;
  /** Swatch colors for the picker card (light/dark). */
  swatch: { bg: string; surface: string; accent: string; fg: string };
}

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: "feltrix-original",
    label: "Feltrix Original",
    description: "Warm paper canvas with a terracotta accent.",
    swatch: { bg: "#faf9f5", surface: "#f0eee6", accent: "#c6613f", fg: "#141413" },
  },
  {
    id: "feltrix-black",
    label: "Feltrix Black",
    description: "OpenAI-style near-black, cool neutrals, teal accent.",
    swatch: { bg: "#0d0d0f", surface: "#18181b", accent: "#10a37f", fg: "#ececf1" },
  },
];

export function presetMeta(id: ThemePresetId): ThemePresetMeta {
  return THEME_PRESETS.find((p) => p.id === id) || THEME_PRESETS[0];
}
