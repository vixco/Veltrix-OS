"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { pb } from "./pocketbase";
import type { RecordModel } from "pocketbase";

export type AuthMode = "local" | "cloud";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  /** True when this is a local guest identity (no backend). */
  guest?: boolean;
  record?: RecordModel;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  mode: AuthMode;
  init: () => void;
  continueAsGuest: (name?: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
}

function mapUser(record: RecordModel | null): AuthUser | null {
  if (!record) return null;
  return {
    id: record.id,
    email: record.email || "",
    name: record.name || record.email?.split("@")[0] || "User",
    avatar: record.avatar || undefined,
    record,
  };
}

const GUEST_ID = "local-guest";
const AUTH_COOKIE = "pb_auth";

function setAuthCookie(token: string) {
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function makeGuest(name?: string): AuthUser {
  return {
    id: GUEST_ID,
    email: "",
    name: name || "Guest",
    guest: true,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,
      mode: "local",

      init: () => {
        if (get().initialized) return;
        const client = pb();
        // Cloud identity wins if a real PocketBase session exists.
        const cloud = mapUser(client.authStore.record);
        if (cloud) {
          set({ user: cloud, initialized: true, mode: "cloud" });
        } else {
          // Fall back to a local guest so the app is usable with no backend.
          const existing = get().user;
          set({
            user: existing?.guest ? existing : makeGuest(),
            initialized: true,
            mode: "local",
          });
        }
        client.authStore.onChange(() => {
          const next = mapUser(client.authStore.record);
          if (next) set({ user: next, mode: "cloud" });
        });
      },

      continueAsGuest: (name) => {
        set({ user: makeGuest(name), mode: "local", initialized: true });
      },

      signIn: async (email, password) => {
        set({ loading: true });
        try {
          const result = await pb()
            .collection("users")
            .authWithPassword(email, password);
          set({ user: mapUser(result.record), mode: "cloud" });
          setAuthCookie(pb().authStore.token);
        } finally {
          set({ loading: false });
        }
      },

      signUp: async (email, password, name) => {
        set({ loading: true });
        try {
          const client = pb();
          await client.collection("users").create({
            email,
            password,
            passwordConfirm: password,
            name,
          });
          const result = await client
            .collection("users")
            .authWithPassword(email, password);
          set({ user: mapUser(result.record), mode: "cloud" });
          setAuthCookie(pb().authStore.token);
        } finally {
          set({ loading: false });
        }
      },

      signOut: () => {
        const wasCloud = get().mode === "cloud";
        if (wasCloud) {
          pb().authStore.clear();
          clearAuthCookie();
        }
        // Revert to a local guest rather than locking the user out.
        set({ user: makeGuest(), mode: "local" });
      },
    }),
    {
      name: "veltrix-auth",
      partialize: (s) => ({ user: s.user, mode: s.mode }),
    }
  )
);
