"use client";

import { create } from "zustand";

// =================================================================
// Notification store — bottom-right toasts for response completions.
// =================================================================

export interface Toast {
  id: string;
  title: string;
  body?: string;
  /** Epoch ms when the related work started (for "in Xs" timing). */
  startedAt?: number;
  /** Optional click target (conversation id) to jump back to the chat. */
  conversationId?: string;
  createdAt: number;
}

interface NotificationState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "createdAt">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `ntf_${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { ...t, id, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, toast].slice(-4) }));
    // Auto-dismiss after 6s.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 6000);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Fire a response-completed notification honoring user preferences. */
export function notifyResponseComplete(opts: {
  conversationId?: string;
  title: string;
  body?: string;
  startedAt?: number;
  enabled: boolean;
  desktop: boolean;
  sound: boolean;
}) {
  if (!opts.enabled) return;
  useNotificationStore.getState().push({
    title: opts.title,
    body: opts.body,
    startedAt: opts.startedAt,
    conversationId: opts.conversationId,
  });
  if (opts.desktop && typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(opts.title, { body: opts.body });
    } catch {}
  }
  if (opts.sound) {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {}
  }
}
