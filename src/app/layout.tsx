import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PreferencesApplier } from "@/components/preferences-applier";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap", weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = { title: "Veltrix OS", description: "Your AI operating system" };
export const viewport: Viewport = { themeColor: "#faf9f5" };

// No-flash boot: read persisted preferences and apply theme preset, motion,
// chat font, color mode (dark class) and <html lang> before first paint.
const bootScript = `
(function() {
  try {
    var raw = localStorage.getItem("veltrix-preferences");
    var prefs = raw ? JSON.parse(raw) : null;
    var s = (prefs && prefs.state) || {};
    var ap = s.appearance || {};
    var html = document.documentElement;
    if (ap.themePreset) html.setAttribute("data-theme-preset", ap.themePreset);
    if (s.motion) html.setAttribute("data-motion", s.motion);
    if (ap.chatFont) html.setAttribute("data-chat-font", ap.chatFont);
    if (ap.chatFontSize) html.setAttribute("data-chat-font-size", ap.chatFontSize);
    html.style.setProperty("--chat-font-size", (ap.chatFontSize || 15) + "px");
    var dark = ap.colorMode === "dark" || (ap.colorMode === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : ap.colorMode === "dark");
    if (dark) html.classList.add("dark"); else html.classList.remove("dark");
    var lang = s.language || "en-US";
    var tag = "en-US";
    var map = {"en-US":"en-US","fr-FR":"fr-FR","de-DE":"de-DE","hi-IN":"hi-IN","id-ID":"id-ID","it-IT":"it-IT","zh-CN":"zh-CN","zh-TW":"zh-TW","pt-PT":"pt-PT","es-LATAM":"es-419","es-ES":"es-ES"};
    tag = map[lang] || "en-US";
    html.setAttribute("lang", tag);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${serif.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <PreferencesApplier />
        {children}
      </body>
    </html>
  );
}
