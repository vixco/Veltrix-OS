"use client";

import * as React from "react";
import {
  User, Palette, Sparkles, Globe, Type, Bell, UserCircle,
  Shield, Brain, Download, Wrench, Cpu, RefreshCw, Eye, EyeOff,
  Check, Loader2, AlertCircle, Search, Trash2, LogOut, Plug,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "./avatar";
import { ModelLogo } from "@/lib/model-logos";
import {
  usePreferences, firstName, type StyleId, type ChatFont,
  type MotionMode, type ColorMode, type ThemePresetId, type LanguageId,
} from "@/lib/preferences";
import { THEME_PRESETS } from "@/lib/theme-presets";
import { LANGUAGES, languageMeta, t } from "@/lib/i18n";
import { TOOLS_CATALOG, groupedCatalog } from "@/lib/tools-catalog";
import { useAuthStore } from "@/lib/auth-store";
import { useProviderStore, useChatStore } from "@/lib/store";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { useMemoryStore } from "@/lib/memory-store";
import { cn, downloadText } from "@/lib/utils";
import { useRouter } from "next/navigation";

const SECTIONS = [
  { id: "general", icon: User, key: "set.general" },
  { id: "themes", icon: Palette, key: "set.themes" },
  { id: "motion", icon: Sparkles, key: "set.motion" },
  { id: "language", icon: Globe, key: "set.language" },
  { id: "style", icon: Type, key: "set.style" },
  { id: "notifications", icon: Bell, key: "set.notifications" },
  { id: "account", icon: UserCircle, key: "set.account" },
  { id: "privacy", icon: Shield, key: "set.privacy" },
  { id: "memory", icon: Brain, key: "set.memoryPrefs" },
  { id: "import", icon: Download, key: "set.import" },
  { id: "tools", icon: Wrench, key: "set.tools" },
  { id: "models", icon: Cpu, key: "set.models" },
  { id: "providers", icon: Plug, key: "set.providers" },
] as const;

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-10 rounded-full transition-colors shrink-0", checked ? "bg-accent" : "bg-surface-3")}
      role="switch" aria-checked={checked}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        {desc && <p className="text-[12px] text-muted-fg mt-0.5 leading-snug">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-surface/60 p-3", className)}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-foreground mb-2">{children}</h3>;
}

export function SettingsPanel({ open, onClose, initialTab }: { open: boolean; onClose: () => void; initialTab?: string }) {
  const [tab, setTab] = React.useState<string>(initialTab || "general");
  React.useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab, open]);
  const lang = usePreferences((s) => s.language);
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl">
      <div className="flex h-[640px] max-h-[88vh]">
        <div className="w-[190px] shrink-0 border-r border-border p-2 overflow-y-auto scrollbar-thin">
          <div className="px-2 py-2 mb-1"><p className="text-[15px] font-semibold text-foreground">Settings</p></div>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = tab === s.id;
            return (
              <button key={s.id} onClick={() => setTab(s.id)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-colors text-left",
                  active ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground hover:bg-surface-2")}>
                <Icon className="h-4 w-4 shrink-0" />
                {t(s.key, lang)}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {tab === "general" && <GeneralTab />}
          {tab === "themes" && <ThemesTab />}
          {tab === "motion" && <MotionTab />}
          {tab === "language" && <LanguageTab />}
          {tab === "style" && <StyleTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "account" && <AccountTab onClose={onClose} />}
          {tab === "privacy" && <PrivacyTab />}
          {tab === "memory" && <MemoryTab />}
          {tab === "import" && <ImportTab />}
          {tab === "tools" && <ToolsTab />}
          {tab === "models" && <ModelsTab />}
          {tab === "providers" && <ProvidersTab />}
        </div>
      </div>
      <div className="flex items-center justify-end px-6 pb-5 pt-2">
        <Button variant="ghost" onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[12px] font-medium text-muted-fg">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 border border-border p-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={cn("px-3 h-7 rounded-md text-[12px] transition-colors", value === o.v ? "bg-surface-3 text-foreground shadow-sm" : "text-muted-fg hover:text-foreground")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function GeneralTab() {
  const { profile, setProfile, setAvatar, rerollAvatar } = usePreferences();
  const appearance = usePreferences((s) => s.appearance);
  const setAppearance = usePreferences((s) => s.setAppearance);
  const FONTS: { id: ChatFont; label: string; cls: string }[] = [
    { id: "sans", label: "Sans", cls: "font-sans" },
    { id: "serif", label: "Serif", cls: "font-serif" },
    { id: "mono", label: "Mono", cls: "font-mono" },
  ];
  return (
    <div className="space-y-5 max-w-[520px]">
      <div>
        <SectionTitle>Profile</SectionTitle>
        <Card>
          <div className="flex items-center gap-4">
            <Avatar config={profile.avatar} className="h-16 w-16 rounded-2xl" />
            <div className="flex-1">
              <p className="text-[12px] text-muted-fg mb-2">Random avatar - reroll for a new one. No photo uploads.</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" onClick={rerollAvatar}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reroll</Button>
                <Button variant="ghost" onClick={() => setAvatar({ style: "bottts" })}>Bots</Button>
                <Button variant="ghost" onClick={() => setAvatar({ style: "shapes" })}>Shapes</Button>
                <Button variant="ghost" onClick={() => setAvatar({ style: "identicon" })}>Ident</Button>
                <Button variant="ghost" onClick={() => setAvatar({ style: "rings" })}>Rings</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-3">
        <Field label="Full name" value={profile.fullName} onChange={(v) => setProfile({ fullName: v })} placeholder="Jane Doe" />
        <Field label="What should Veltrix call you?" value={profile.displayName} onChange={(v) => setProfile({ displayName: v })} placeholder="Jane" />
        <Field label="What best describes your work?" value={profile.workDescription} onChange={(v) => setProfile({ workDescription: v })} placeholder="Product designer" />
        <div>
          <label className="text-[12px] font-medium text-muted-fg">Custom instructions</label>
          <p className="text-[11px] text-muted-fg/70 mb-1.5">Added to every system prompt. Tell Veltrix how you like to work.</p>
          <textarea value={profile.instructions} onChange={(e) => setProfile({ instructions: e.target.value })}
            rows={4} placeholder="Be concise. I prefer code blocks with no extra commentary."
            className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-[13px] text-foreground placeholder:text-muted-fg/50 focus:outline-none focus:border-accent/50 resize-none" />
        </div>
      </div>
      <div>
        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <Row title="Color mode" desc="Light, dark, or follow your system.">
            <Segmented value={appearance.colorMode} options={[{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }, { v: "system", l: "System" }]} onChange={(v) => setAppearance({ colorMode: v as ColorMode })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <div className="py-3">
            <p className="text-[13px] font-medium text-foreground mb-1">Chat font</p>
            <div className="flex gap-2">
              {FONTS.map((f) => (
                <button key={f.id} onClick={() => setAppearance({ chatFont: f.id })}
                  className={cn("px-4 h-9 rounded-lg border text-[13px] transition-colors", appearance.chatFont === f.id ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-fg hover:text-foreground hover:bg-surface-2", f.cls)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-border my-1" />
          <Row title="Chat font size" desc={appearance.chatFontSize + "px"}>
            <input type="range" min={13} max={18} step={1} value={appearance.chatFontSize} onChange={(e) => setAppearance({ chatFontSize: Number(e.target.value) })} className="w-40 accent-accent" />
          </Row>
        </Card>
      </div>
    </div>
  );
}

function ThemesTab() {
  const appearance = usePreferences((s) => s.appearance);
  const setAppearance = usePreferences((s) => s.setAppearance);
  return (
    <div className="max-w-[560px]">
      <SectionTitle>Themes</SectionTitle>
      <p className="text-[12px] text-muted-fg mb-3">Pick a visual theme. Each ships with its own light and dark palette.</p>
      <div className="grid grid-cols-2 gap-3">
        {THEME_PRESETS.map((p) => {
          const active = appearance.themePreset === p.id;
          return (
            <button key={p.id} onClick={() => setAppearance({ themePreset: p.id as ThemePresetId })}
              className={cn("rounded-xl border p-3 text-left transition-all lift", active ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-border-hover")}>
              <div className="flex gap-1.5 mb-3 h-16 rounded-lg overflow-hidden">
                <div className="flex-1 flex flex-col">
                  <div style={{ background: p.swatch.bg }} className="flex-1" />
                  <div style={{ background: p.swatch.surface }} className="h-5" />
                </div>
                <div className="w-8 flex flex-col">
                  <div style={{ background: p.swatch.fg }} className="flex-1" />
                  <div style={{ background: p.swatch.accent }} className="h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                {active && <Check className="h-4 w-4 text-accent" />}
              </div>
              <p className="text-[11px] text-muted-fg mt-0.5 leading-snug">{p.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MotionTab() {
  const motion = usePreferences((s) => s.motion);
  const setMotion = usePreferences((s) => s.setMotion);
  const opts: { v: MotionMode; l: string; d: string }[] = [
    { v: "system", l: "System", d: "Full, expressive motion. Smooth transitions, springy feedback, staggered entrances." },
    { v: "reduced", l: "Reduced", d: "Minimal motion for the best performance. Quick, functional, no decorative animation." },
  ];
  return (
    <div className="max-w-[520px]">
      <SectionTitle>Motion</SectionTitle>
      <div className="space-y-2">
        {opts.map((o) => {
          const active = motion === o.v;
          return (
            <button key={o.v} onClick={() => setMotion(o.v)}
              className={cn("w-full rounded-xl border p-3 text-left transition-all", active ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-border-hover")}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{o.l}</span>
                {active && <Check className="h-4 w-4 text-accent" />}
              </div>
              <p className="text-[12px] text-muted-fg mt-0.5 leading-snug">{o.d}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LanguageTab() {
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const [q, setQ] = React.useState("");
  const list = LANGUAGES.filter((l) => l.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="max-w-[480px]">
      <SectionTitle>Language</SectionTitle>
      <p className="text-[12px] text-muted-fg mb-3">Controls the interface language and how Veltrix addresses you.</p>
      <div className="relative mb-3">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-fg/50" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search languages" className="w-full h-9 pl-8 pr-3 rounded-lg bg-surface-2 border border-border text-[13px] focus:outline-none focus:border-accent/50" />
      </div>
      <div className="space-y-1">
        {list.map((l) => {
          const active = language === l.id;
          return (
            <button key={l.id} onClick={() => setLanguage(l.id as LanguageId)}
              className={cn("w-full flex items-center gap-2.5 px-3 h-10 rounded-lg text-left transition-colors", active ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground hover:bg-surface-2")}>
              <span className="flex-1 text-[13px]">{l.label}</span>
              <span className="text-[11px] text-muted-fg/60 font-mono">{l.tag}</span>
              {active && <Check className="h-4 w-4 text-accent" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StyleTab() {
  const appearance = usePreferences((s) => s.appearance);
  const setAppearance = usePreferences((s) => s.setAppearance);
  const STYLES: { id: StyleId; l: string; d: string }[] = [
    { id: "buttery", l: "Buttery", d: "Warm, smooth, easy-going. Soft transitions, friendly tone." },
    { id: "professional", l: "Professional", d: "Crisp, direct, work-focused. Minimal flourishes." },
    { id: "chill", l: "Chill", d: "Relaxed and casual. Low-key, conversational." },
    { id: "concise", l: "Concise", d: "Tight and to the point. No filler." },
    { id: "playful", l: "Playful", d: "Light and fun. A bit of bounce and humor." },
  ];
  return (
    <div className="max-w-[520px]">
      <SectionTitle>Style</SectionTitle>
      <p className="text-[12px] text-muted-fg mb-3">The tone and feel of Veltrix replies.</p>
      <div className="grid grid-cols-1 gap-2">
        {STYLES.map((s) => {
          const active = appearance.style === s.id;
          return (
            <button key={s.id} onClick={() => setAppearance({ style: s.id })}
              className={cn("flex items-center justify-between rounded-xl border p-3 text-left transition-all", active ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-border-hover")}>
              <div>
                <span className="text-[13px] font-medium text-foreground">{s.l}</span>
                <p className="text-[12px] text-muted-fg mt-0.5 leading-snug">{s.d}</p>
              </div>
              {active && <Check className="h-4 w-4 text-accent shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const n = usePreferences((s) => s.notifications);
  const set = usePreferences((s) => s.setNotifications);
  const [perm, setPerm] = React.useState<string>(typeof Notification !== "undefined" ? Notification.permission : "denied");
  return (
    <div className="max-w-[520px]">
      <SectionTitle>Notifications</SectionTitle>
      <Card>
        <Row title="Response completions" desc="Show a toast in the bottom-right when a response finishes.">
          <Switch checked={n.responseCompletions} onChange={(v) => set({ responseCompletions: v })} />
        </Row>
        <div className="h-px bg-border my-1" />
        <Row title="Desktop notifications" desc="Use your OS notification center (asks permission once).">
          <div className="flex items-center gap-2">
            {perm === "granted" && <span className="text-[11px] text-success">Allowed</span>}
            {perm !== "granted" && (
              <Button variant="ghost" onClick={async () => {
                if (typeof Notification === "undefined") return;
                const p = await Notification.requestPermission();
                setPerm(p);
                if (p === "granted") set({ desktopNotifications: true });
              }}>Enable</Button>
            )}
            <Switch checked={n.desktopNotifications && perm === "granted"} onChange={(v) => set({ desktopNotifications: v })} />
          </div>
        </Row>
        <div className="h-px bg-border my-1" />
        <Row title="Play a sound" desc="A subtle chime when a response completes.">
          <Switch checked={n.sound} onChange={(v) => set({ sound: v })} />
        </Row>
      </Card>
      <p className="text-[11px] text-muted-fg mt-3">Tip: voice is coming soon. Speed settings for voice will appear here once available.</p>
    </div>
  );
}

function AccountTab({ onClose }: { onClose: () => void }) {
  const { user, mode, signOut } = useAuthStore();
  const router = useRouter();
  const [sessions, setSessions] = React.useState<{ id: string; label: string; current: boolean }[]>([]);

  React.useEffect(() => {
    const s = [{ id: "this-device", label: "This device (local)", current: true }];
    if (mode === "cloud" && user) s.unshift({ id: user.id, label: (user.email || "cloud") + " (cloud)", current: false });
    setSessions(s);
  }, [mode, user]);

  function deleteAccount() {
    if (!confirm("Delete your account and wipe all local data? This cannot be undone.")) return;
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("veltrix-")) localStorage.removeItem(k);
      }
    } catch {}
    signOut();
    onClose();
    router.push("/login");
  }

  return (
    <div className="max-w-[520px] space-y-5">
      <div>
        <SectionTitle>Account</SectionTitle>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent text-accent-fg flex items-center justify-center font-semibold uppercase text-[14px]">
              {(user?.name || "G").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{user?.name || "Guest"}</p>
              <p className="text-[12px] text-muted-fg truncate">{mode === "cloud" ? user?.email : "Local guest"}</p>
            </div>
          </div>
        </Card>
      </div>
      <div>
        <SectionTitle>Active sessions</SectionTitle>
        <Card className="p-0 overflow-hidden">
          {sessions.map((s, i) => (
            <div key={s.id} className={cn("flex items-center justify-between px-3 py-2.5", i > 0 && "border-t border-border")}>
              <div>
                <p className="text-[13px] text-foreground">{s.label}</p>
                {s.current && <span className="text-[11px] text-success">Current</span>}
              </div>
              {!s.current && (
                <Button variant="ghost" onClick={() => signOut()} className="text-destructive"><LogOut className="h-3.5 w-3.5 mr-1.5" />Log out</Button>
              )}
            </div>
          ))}
        </Card>
        {mode === "cloud" && (
          <Button variant="secondary" className="mt-2" onClick={() => signOut()}><LogOut className="h-3.5 w-3.5 mr-1.5" />Log out of all accounts</Button>
        )}
      </div>
      <div>
        <SectionTitle>Danger zone</SectionTitle>
        <Card className="border-destructive/30">
          <Row title="Delete account" desc="Permanently erase your local profile, chats, memories, and settings.">
            <Button variant="ghost" onClick={deleteAccount} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</Button>
          </Row>
        </Card>
      </div>
    </div>
  );
}

function PrivacyTab() {
  const p = usePreferences((s) => s.privacy);
  const set = usePreferences((s) => s.setPrivacy);

  function detectLocation() {
    if (!navigator.geolocation) { set({ lastLocation: "unavailable" }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => set({ lastLocation: pos.coords.latitude.toFixed(2) + ", " + pos.coords.longitude.toFixed(2) }),
      () => set({ lastLocation: "denied" }),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  function exportData() {
    const dump: Record<string, any> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("veltrix-")) {
          try { dump[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch { dump[k] = localStorage.getItem(k); }
        }
      }
    } catch {}
    downloadText("veltrix-export-" + Date.now() + ".json", JSON.stringify(dump, null, 2), "application/json");
  }

  return (
    <div className="max-w-[520px] space-y-5">
      <div>
        <SectionTitle>Privacy</SectionTitle>
        <Card>
          <Row title="Location metadata" desc="Attach your coarse location to memories and exports. Never sent anywhere without you.">
            <Switch checked={p.locationMetadata} onChange={(v) => set({ locationMetadata: v })} />
          </Row>
          {p.locationMetadata && (
            <div className="pt-2 border-t border-border mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-fg">Captured: {p.lastLocation || "none yet"}</span>
                <Button variant="ghost" onClick={detectLocation}>Detect my location</Button>
              </div>
            </div>
          )}
          <div className="h-px bg-border my-1" />
          <Row title="Shared chats" desc="Allow generating public share links for conversations.">
            <Switch checked={p.sharedChats} onChange={(v) => set({ sharedChats: v })} />
          </Row>
        </Card>
      </div>
      <div>
        <SectionTitle>Data</SectionTitle>
        <Card>
          <Row title="Export data" desc="Download all your chats, memories, projects, and settings as JSON.">
            <Button variant="secondary" onClick={exportData}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
          </Row>
        </Card>
      </div>
    </div>
  );
}

function MemoryTab() {
  const m = usePreferences((s) => s.memory);
  const set = usePreferences((s) => s.setMemory);
  const memoryCount = useMemoryStore((s) => s.nodes.length);
  const clearProject = useMemoryStore((s) => s.clearProject);
  const router = useRouter();
  return (
    <div className="max-w-[520px] space-y-5">
      <div>
        <SectionTitle>Memory</SectionTitle>
        <Card>
          <Row title="Generate memory from chat history" desc="Automatically extract and store memories as you chat. On by default.">
            <Switch checked={m.generateFromChat} onChange={(v) => set({ generateFromChat: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="Use memory in replies" desc="Weave remembered context into Veltrix responses.">
            <Switch checked={m.useContext} onChange={(v) => set({ useContext: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="Auto-consolidate" desc="Promote and merge strong, duplicate memories in the background.">
            <Switch checked={m.autoConsolidate} onChange={(v) => set({ autoConsolidate: v })} />
          </Row>
        </Card>
      </div>
      <div>
        <SectionTitle>View and manage</SectionTitle>
        <Card>
          <Row title="Memories" desc={memoryCount + " stored memory node" + (memoryCount === 1 ? "" : "s") + "."}>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => router.push("/memory")}><Brain className="h-3.5 w-3.5 mr-1.5" />View memories</Button>
              <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm("Clear all global memories?")) clearProject("global"); }}>Clear all</Button>
            </div>
          </Row>
        </Card>
      </div>
    </div>
  );
}

function ImportTab() {
  const createConversation = useChatStore((s) => s.createConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const setActive = useChatStore((s) => s.setActive);
  const createMemory = useMemoryStore((s) => s.create);
  const [source, setSource] = React.useState<"chatgpt" | "gemini" | "other" | "cloud">("chatgpt");
  const [status, setStatus] = React.useState("");
  const [pasted, setPasted] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const SOURCES = [
    { id: "chatgpt", l: "ChatGPT", d: "Export from ChatGPT." },
    { id: "gemini", l: "Gemini", d: "Export from Gemini." },
    { id: "other", l: "Other AI", d: "Any other assistant that knows you." },
    { id: "cloud", l: "Cloud / backup", d: "A previous Veltrix cloud backup." },
  ] as const;

  // Claude-style structured memory export prompt. The old AI returns dated
  // entries grouped by category; Veltrix then reads that into its memory.
  const exportPrompt = [
    "Export all of my stored memories and any context you've learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and preferences.",
    "",
    "## Categories (output in this order):",
    "",
    "1. **Instructions**: Rules I've explicitly asked you to follow going forward - tone, format, style, \"always do X\", \"never do Y\", and corrections to your behavior. Only include rules from stored memories, not from conversations.",
    "2. **Identity**: Name, age, location, education, family, relationships, languages, and personal interests.",
    "3. **Career**: Current and past roles, companies, and general skill areas.",
    "4. **Projects**: Projects I meaningfully built or committed to. Ideally ONE entry per project. Include what it does, current status, and any key decisions. Use the project name or a short descriptor as the first words of the entry.",
    "5. **Preferences**: Opinions, tastes, and working-style preferences that apply broadly.",
    "",
    "## Format:",
    "",
    "Use section headers for each category. Within each category, list one entry per line, sorted by oldest date first. Format each line as:",
    "",
    "[YYYY-MM-DD] - Entry content here.",
    "",
    "If no date is known, use [unknown] instead.",
    "",
    "## Output:",
    "- Wrap the entire export in a single code block for easy copying.",
    "- After the code block, state whether this is the complete set or if more remain.",
  ].join("\n");

  function copyPrompt() {
    try { navigator.clipboard.writeText(exportPrompt); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  type Mem = { title: string; content: string; kind: "short" | "long"; strength: number; tags: string[] };

  function extractMemoriesFromExport(text: string): Mem[] {
    const out: Mem[] = [];
    const lines = text.split(/\r?\n/);
    let category = "Preferences";
    const catStrength: Record<string, number> = {
      instructions: 0.85, identity: 0.8, career: 0.7, projects: 0.75, preferences: 0.65,
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const hdr = line.match(/^(?:##\s*)?(?:\d+\.\s*)?\**\s*(instructions|identity|career|projects|preferences)\s*\**\s*:?$/i);
      if (hdr) { category = hdr[1].toLowerCase(); continue; }
      const entry = line.match(/^\[(?:\d{4}-\d{2}-\d{2}|unknown)\]\s*-\s*(.+)$/i);
      if (entry) {
        const content = entry[1].trim();
        if (content.length < 3) continue;
        out.push({ title: content.slice(0, 90), content: line, kind: "long", strength: catStrength[category] ?? 0.6, tags: [category] });
      }
    }
    return out;
  }

  function convFromAny(c: any): { title: string; messages: { role: string; content: string }[] } {
    const title = c.title || c.name || "Imported chat";
    const msgs = c.messages || c.chat_messages || [];
    const out = (Array.isArray(msgs) ? msgs : []).map((m: any) => ({
      role: (m.role || m.author || "user") === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : (m.content?.parts?.join("\n") || m.text || ""),
    })).filter((mm: any) => mm.content);
    return { title, messages: out as any };
  }

  function looksLikeJson(text: string): boolean {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let raw = (fence ? fence[1] : text).trim();
    return raw.startsWith("[") || raw.startsWith("{");
  }

  function parsePastedConversations(text: string): { title: string; messages: { role: string; content: string }[] }[] {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let raw = fence ? fence[1] : text;
    const start = raw.search(/[\[{]/);
    if (start === -1) return [];
    raw = raw.slice(start);
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data.map(convFromAny);
      if (Array.isArray(data?.conversations)) return data.conversations.map(convFromAny);
      if (Array.isArray(data?.messages)) return [{ title: "Imported chat", messages: data.messages }];
    } catch {}
    return [];
  }

  function doImport() {
    setBusy(true); setStatus("");
    try {
      const text = pasted.trim();
      if (!text) { setBusy(false); return; }
      if (looksLikeJson(text)) {
        const convs = parsePastedConversations(text);
        if (convs.length === 0) { setStatus("Could not parse that JSON. Make sure it is the array your old AI returned."); setBusy(false); return; }
        let firstId: string | null = null;
        for (const c of convs) {
          const id = createConversation();
          if (!firstId) firstId = id;
          for (const m of c.messages) addMessage(id, { role: m.role as "user" | "assistant", content: m.content });
        }
        if (firstId) setActive(firstId);
        setStatus("Imported " + convs.length + " conversation" + (convs.length === 1 ? "" : "s") + " into the sidebar.");
        setPasted("");
        return;
      }
      const mems = extractMemoriesFromExport(text);
      const convId = createConversation();
      addMessage(convId, { role: "user", content: "Here is everything my previous assistant knew about me. Read it and remember it:\n\n" + text });
      let stored = 0;
      for (const m of mems) {
        const node = createMemory({ projectId: "global", title: m.title, content: m.content, kind: m.kind, strength: m.strength, tags: m.tags, sourceConvIds: [convId] });
        if (node) stored++;
      }
      setActive(convId);
      setStatus("Fed the export to Veltrix (open the chat to see it). Stored " + stored + " memor" + (stored === 1 ? "y" : "ies") + " across Instructions, Identity, Career, Projects and Preferences." + (mems.length === 0 ? " No dated entries were detected, but the full text is now in your chat." : ""));
      setPasted("");
    } catch (e: any) {
      setStatus("Import failed: " + (e?.message || "unknown error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[600px] space-y-4">
      <div>
        <SectionTitle>Import</SectionTitle>
        <p className="text-[12px] text-muted-fg mb-3">Veltrix writes the export prompt for you. Paste it into your old AI, then paste its answer back here. Veltrix reads it in and stores everything it learned about you as memories.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SOURCES.map((s) => (
          <button key={s.id} onClick={() => setSource(s.id as any)}
            className={cn("rounded-xl border p-3 text-left transition-all", source === s.id ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-border-hover")}>
            <p className="text-[13px] font-medium text-foreground">{s.l}</p>
            <p className="text-[11px] text-muted-fg mt-0.5 leading-snug">{s.d}</p>
          </button>
        ))}
      </div>
      <Card>
        <p className="text-[12px] font-medium text-foreground mb-1">Step 1 - give this prompt to your old AI</p>
        <p className="text-[11px] text-muted-fg/70 mb-2">Asks it to export every stored memory and piece of context it has about you, grouped and dated.</p>
        <pre className="text-[11px] leading-snug text-foreground bg-surface-2 border border-border rounded-lg p-2.5 max-h-[200px] overflow-y-auto scrollbar-thin whitespace-pre-wrap">{exportPrompt}</pre>
        <div className="flex gap-2 mt-2">
          <Button variant="secondary" onClick={copyPrompt}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </Card>
      <Card>
        <p className="text-[12px] font-medium text-foreground mb-1">Step 2 - paste your old AI's answer here</p>
        <p className="text-[11px] text-muted-fg/70 mb-2">Paste the whole reply (code block and all). Veltrix feeds it to itself and saves the entries as memories. JSON conversation exports work too.</p>
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={9}
          placeholder="Paste the code block your old AI produced here..."
          className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-[12px] font-mono text-foreground placeholder:text-muted-fg/50 focus:outline-none focus:border-accent/50 resize-none scrollbar-thin" />
        <Button variant="secondary" className="mt-2" onClick={doImport} disabled={busy || !pasted.trim()}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          Import into Veltrix
        </Button>
        {status && <p className="text-[12px] text-muted-fg mt-2 leading-snug">{status}</p>}
      </Card>
    </div>
  );
}
function ToolsTab() {
  const tools = usePreferences((s) => s.tools);
  const setToolEnabled = usePreferences((s) => s.setToolEnabled);
  const groups = groupedCatalog();
  const KIND_LABEL: Record<string, string> = { tool: "Tools", skill: "Skills", connector: "Connectors" };
  const enabled = (id: string) => tools.find((t) => t.id === id)?.enabled ?? false;

  return (
    <div className="max-w-[600px] space-y-4">
      <SectionTitle>Tools, skills and connectors</SectionTitle>
      <p className="text-[12px] text-muted-fg">Install capabilities from the marketplace. Veltrix advertises enabled tools to the model so it knows what it can do.</p>
      {(["skill", "tool", "connector"] as const).map((kind) => (
        <div key={kind}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-fg/60 mb-1.5">{KIND_LABEL[kind]}</p>
          <div className="space-y-1.5">
            {groups[kind].map((item) => (
              <div key={item.id} className={cn("flex items-start justify-between gap-3 rounded-xl border border-border p-3", item.featured && "border-accent/40 bg-accent/5")}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{item.name}</span>
                    {item.featured && <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">Featured</span>}
                  </div>
                  <p className="text-[12px] text-muted-fg mt-0.5 leading-snug">{item.description}</p>
                  <p className="text-[11px] text-muted-fg/60 mt-1">by {item.author} - {item.category}</p>
                </div>
                <Switch checked={enabled(item.id)} onChange={(v) => setToolEnabled(item.id, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelsTab() {
  const caps = usePreferences((s) => s.capabilities);
  const setCaps = usePreferences((s) => s.setCapabilities);
  const providers = useProviderStore((s) => s.providers);
  const getModels = useProviderStore((s) => s.getModels);
  const [pid, setPid] = React.useState<ProviderId>((caps.defaultProvider as ProviderId) || "ollama");
  const models = getModels(pid);

  React.useEffect(() => {
    if (!caps.defaultModel && models.length) setCaps({ defaultModel: models[0].id, defaultProvider: pid });
  }, [models, caps.defaultModel, pid, setCaps]);

  const enabledProviders = (Object.keys(providers) as ProviderId[]).filter((p) => providers[p]?.enabled || p === "ollama");

  return (
    <div className="max-w-[560px] space-y-5">
      <div>
        <SectionTitle>Default model</SectionTitle>
        <p className="text-[12px] text-muted-fg mb-3">The model Veltrix uses by default for new chats. Switch any time from the header.</p>
        <Card>
          <div className="space-y-2">
            <div>
              <label className="text-[12px] font-medium text-muted-fg">Provider</label>
              <select value={pid} onChange={(e) => setPid(e.target.value as ProviderId)} className="mt-1 w-full h-9 rounded-lg bg-surface-2 border border-border px-3 text-[13px] text-foreground focus:outline-none focus:border-accent/50">
                {enabledProviders.map((p) => <option key={p} value={p}>{PROVIDERS[p].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-fg">Model</label>
              <select value={caps.defaultModel} onChange={(e) => setCaps({ defaultModel: e.target.value, defaultProvider: pid })} className="mt-1 w-full h-9 rounded-lg bg-surface-2 border border-border px-3 text-[13px] text-foreground focus:outline-none focus:border-accent/50">
                {models.length === 0 && <option value="">No models - check provider settings</option>}
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {caps.defaultModel && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 border border-border p-2.5">
              <ModelLogo modelId={caps.defaultModel} provider={pid} className="h-6 w-6" />
              <span className="text-[12px] text-muted-fg">Each model automatically gets its brand logo.</span>
            </div>
          )}
        </Card>
      </div>
      <div>
        <SectionTitle>Capabilities</SectionTitle>
        <Card>
          <Row title="Artifacts" desc="Render rich artifacts inline in the chat.">
            <Switch checked={caps.artifacts} onChange={(v) => setCaps({ artifacts: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="AI-powered artifacts" desc="Let Veltrix generate interactive artifacts on its own.">
            <Switch checked={caps.aiPoweredArtifacts} onChange={(v) => setCaps({ aiPoweredArtifacts: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="Code execution" desc="Run code in a sandbox to compute and verify.">
            <Switch checked={caps.codeExecution} onChange={(v) => setCaps({ codeExecution: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="Allow network access" desc="Let tools and code execution reach the network.">
            <Switch checked={caps.allowNetwork} onChange={(v) => setCaps({ allowNetwork: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="Web access (no API key)" desc="Let Veltrix search and fetch the web through the host server.">
            <Switch checked={caps.webAccess} onChange={(v) => setCaps({ webAccess: v })} />
          </Row>
          <div className="h-px bg-border my-1" />
          <Row title="Host access" desc="Let Veltrix run shell commands and read/write files on this machine.">
            <Switch checked={caps.hostAccess} onChange={(v) => setCaps({ hostAccess: v })} />
          </Row>
        </Card>
      </div>
    </div>
  );
}

function ProvidersTab() {
  const providers = useProviderStore((s) => s.providers);
  const updateProvider = useProviderStore((s) => s.updateProvider);
  const refreshModels = useProviderStore((s) => s.refreshModels);
  const getModels = useProviderStore((s) => s.getModels);
  const discovered = useProviderStore((s) => s.discoveredModels);
  const connStatus = useProviderStore((s) => s.connectionStatus);
  const [selected, setSelected] = React.useState<ProviderId>("ollama");
  const [showKey, setShowKey] = React.useState(false);
  const adapter = PROVIDERS[selected];
  const config = providers[selected];
  const models = getModels(selected);
  const status = connStatus[selected];
  React.useEffect(() => {
    if (adapter.fetchModels && discovered[selected] === undefined && status !== "connecting") refreshModels(selected);
  }, [selected, adapter, discovered, status, refreshModels]);

  return (
    <div className="flex gap-4 min-h-[400px]">
      <div className="w-[150px] shrink-0 space-y-1">
        {(Object.keys(PROVIDERS) as ProviderId[]).map((pid) => {
          const a = PROVIDERS[pid]; const c = providers[pid]; const st = connStatus[pid];
          return (
            <button key={pid} onClick={() => setSelected(pid)} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-left transition-colors", selected === pid ? "bg-surface-3 text-foreground" : "text-muted-fg hover:text-foreground hover:bg-surface-2")}>
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", st === "error" ? "bg-destructive" : st === "connected" || c?.enabled ? "bg-success" : "bg-muted-fg/30")} />
              {a.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-medium text-foreground">{adapter.label}</h3>
            <p className="text-[12px] text-muted-fg">{adapter.requiresApiKey ? (selected === "ollama" ? "API key for Ollama Cloud (optional for local)" : "Requires API key") : "No API key needed"}</p>
          </div>
          <Switch checked={config?.enabled} onChange={(v) => updateProvider(selected, { enabled: v })} />
        </div>
        {adapter.defaultBaseUrl !== undefined && (
          <div>
            <label className="text-[12px] font-medium text-muted-fg">Base URL</label>
            <Input value={config?.baseUrl || ""} onChange={(e) => updateProvider(selected, { baseUrl: e.target.value })} className="mt-1 font-mono text-[12px]" />
          </div>
        )}
        {adapter.requiresApiKey && (
          <div>
            <label className="text-[12px] font-medium text-muted-fg">API key</label>
            <div className="relative mt-1">
              <Input type={showKey ? "text" : "password"} value={config?.apiKey || ""} onChange={(e) => updateProvider(selected, { apiKey: e.target.value })} className="pr-10 font-mono text-[12px]" />
              <button onClick={() => setShowKey((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-fg">{models.length} model{models.length === 1 ? "" : "s"}</span>
          {adapter.fetchModels && (
            <button onClick={() => refreshModels(selected)} disabled={status === "connecting"} className="flex items-center gap-1.5 text-[12px] text-muted-fg hover:text-foreground">
              {status === "connecting" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Test connection
            </button>
          )}
        </div>
        {status === "error" && <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-[12px] text-destructive"><AlertCircle className="h-3.5 w-3.5 shrink-0" />Connection failed</div>}
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
          {models.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border">
              <ModelLogo modelId={m.id} provider={selected} className="h-5 w-5 shrink-0" />
              <span className="text-[13px] text-foreground">{m.name}</span>
              <span className="text-[11px] text-muted-fg ml-auto font-mono truncate max-w-[120px]">{m.id}</span>
            </div>
          ))}
          {models.length === 0 && status !== "error" && <div className="px-3 py-3 rounded-lg bg-surface-2 border border-border text-[12px] text-muted-fg">No models found. Make sure the server is running.</div>}
        </div>
      </div>
    </div>
  );
}