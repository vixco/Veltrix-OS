"use client";

import { create } from "zustand";

// =================================================================
// Read Aloud (text-to-speech) via the Web Speech API.
// One speaking stream at a time; starting a new utterance cancels the
// previous. A tiny store tracks which message is currently speaking so
// the UI can show a stop button only on the active message.
// =================================================================

interface SpeechState {
  speakingId: string | null;
  setSpeakingId: (id: string | null) => void;
}

export const useSpeechStore = create<SpeechState>((set) => ({
  speakingId: null,
  setSpeakingId: (id) => set({ speakingId: id }),
}));

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_`>#~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, id: string) {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const clean = stripMarkdown(text);
  if (!clean) return;
  const u = new SpeechSynthesisUtterance(clean);
  // Pick a voice that matches the UI language when available.
  const lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
  u.lang = lang;
  u.onend = () => useSpeechStore.getState().setSpeakingId(null);
  u.onerror = () => useSpeechStore.getState().setSpeakingId(null);
  useSpeechStore.getState().setSpeakingId(id);
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  useSpeechStore.getState().setSpeakingId(null);
}
