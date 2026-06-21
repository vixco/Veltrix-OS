"use client";

import * as React from "react";
import { usePreferences } from "@/lib/preferences";
import { languageMeta } from "@/lib/i18n";

// Keeps <html> data attributes in sync with preferences after hydration.
export function PreferencesApplier() {
  const appearance = usePreferences((s) => s.appearance);
  const motion = usePreferences((s) => s.motion);
  const language = usePreferences((s) => s.language);

  React.useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme-preset", appearance.themePreset);
    html.setAttribute("data-motion", motion);
    html.setAttribute("data-chat-font", appearance.chatFont);
    html.setAttribute("data-chat-font-size", String(appearance.chatFontSize));
    html.style.setProperty("--chat-font-size", appearance.chatFontSize + "px");
    html.setAttribute("lang", languageMeta(language).tag);
  }, [appearance.themePreset, appearance.chatFont, appearance.chatFontSize, motion, language]);

  // Color mode (light/dark/system) -> dark class, reacting to system changes too.
  React.useEffect(() => {
    const html = document.documentElement;
    const apply = () => {
      const dark =
        appearance.colorMode === "dark" ||
        (appearance.colorMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (dark) html.classList.add("dark");
      else html.classList.remove("dark");
      try { localStorage.setItem("veltrix-theme", dark ? "dark" : "light"); } catch {}
    };
    apply();
    if (appearance.colorMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [appearance.colorMode]);

  return null;
}
