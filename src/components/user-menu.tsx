"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Settings, Globe, ChevronRight, LogOut, LogIn, Check, Download } from "lucide-react";
import { usePreferences, firstName } from "@/lib/preferences";
import { useAuthStore } from "@/lib/auth-store";
import { LANGUAGES, languageMeta, t } from "@/lib/i18n";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";
import { exportAllData } from "@/lib/export-data";
import { useRouter } from "next/navigation";

interface UserMenuProps {
  onOpenSettings: (tab?: string) => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const profile = usePreferences((s) => s.profile);
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const { user, mode, signOut } = useAuthStore();
  const [open, setOpen] = React.useState(false);
  const [langOpen, setLangOpen] = React.useState(false);
  const router = useRouter();

  const name = firstName(profile);
  const langLabel = languageMeta(language).label;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="group w-full flex items-center gap-2.5 px-2.5 h-11 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
          title="Account & settings"
        >
          <Avatar config={profile.avatar} className="h-7 w-7 shrink-0 rounded-xl" />
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[13px] font-medium text-foreground truncate">{name}</span>
            <span className="block text-[11px] text-muted-fg/70 truncate">
              {mode === "cloud" ? user?.email || "Cloud" : "Local"}
            </span>
          </span>
          <Settings className="h-4 w-4 text-muted-fg/60 group-hover:text-muted-fg transition-colors" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-[130] w-[260px] rounded-xl bg-surface border border-border shadow-2xl p-1.5 animate-scale-in dropdown-in"
        >
          <div className="px-2.5 py-2 mb-1 border-b border-border">
            <p className="text-[13px] font-medium text-foreground truncate">
              {profile.fullName || user?.name || name}
            </p>
            <p className="text-[11px] text-muted-fg truncate">
              {mode === "cloud" ? user?.email || "Signed in" : "Local guest"}
            </p>
          </div>

          <button
            onClick={() => {
              setOpen(false);
              onOpenSettings("general");
            }}
            className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <Settings className="h-4 w-4" />
            {t("menu.settings", language)}
          </button>

          <button
            onClick={() => { exportAllData(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export data
          </button>

          {/* Language with inline submenu */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span className="flex-1 text-left">{t("menu.language", language)}</span>
              <span className="text-[11px] text-muted-fg/60 truncate max-w-[110px]">{langLabel}</span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", langOpen && "rotate-90")} />
            </button>
            {langOpen && (
              <div className="mt-1 mb-1 max-h-[230px] overflow-y-auto scrollbar-thin rounded-lg bg-surface-2 border border-border p-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLanguage(l.id);
                      setLangOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 h-8 rounded-lg text-[12.5px] text-muted-fg hover:text-foreground hover:bg-surface-3 transition-colors"
                  >
                    <span className="flex-1 text-left truncate">{l.label}</span>
                    {language === l.id && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border my-1" />

          {mode === "cloud" ? (
            <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-muted-fg hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {t("menu.signOut", language)}
            </button>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/login");
              }}
              className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-muted-fg hover:text-accent hover:bg-surface-2 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              {t("menu.signIn", language)}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
