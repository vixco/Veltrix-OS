"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Trash2,
  Download,
  Settings,
  PanelLeftClose,
  Sun,
  Moon,
  MessageSquare,
  LogOut,
  LogIn,
  Folder,
} from "lucide-react";
import { useChatStore } from "@/lib/store";
import { useTheme } from "@/lib/use-theme";
import { cn, downloadText, conversationToMarkdown } from "@/lib/utils";
import { ClaudeLogo } from "./claude-logo";
import { useAuthStore } from "@/lib/auth-store";
import { useProjectStore } from "@/lib/project-store";
import { useRouter } from "next/navigation";

interface SidebarProps {
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function groupLabel(ts: number) {
  const now = new Date();
  const d = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfToday - dayMs) return "Yesterday";
  if (ts >= startOfToday - 7 * dayMs) return "Previous 7 days";
  if (ts >= startOfToday - 30 * dayMs) return "Previous 30 days";
  return d.toLocaleDateString("en", { month: "long", year: "numeric" });
}

export function Sidebar({ onOpenSettings, collapsed, onToggleCollapse }: SidebarProps) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const createConversation = useChatStore((s) => s.createConversation);
  const setActive = useChatStore((s) => s.setActive);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { theme, toggle } = useTheme();
  const { user, signOut, mode } = useAuthStore();
  const { projects, activeProjectId } = useProjectStore();
  const router = useRouter();

  const filtered = useMemo(() => {
    const list = query
      ? conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
      : conversations;
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const label = groupLabel(c.updatedAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (collapsed) return null;

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col bg-bg-sidebar border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12">
        <div className="flex items-center gap-2 pl-1">
          <ClaudeLogo className="h-6 w-6 text-accent" />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => createConversation()}
            className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90"
            title="New chat"
          >
            <Plus className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* New chat row */}
      <div className="px-3 pb-2">
        <button
          onClick={() => createConversation()}
          className="group w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13.5px] font-medium text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
          New chat
        </button>
      </div>

      {/* Projects link */}
      <div className="px-3 pb-2">
        <button
          onClick={() => router.push("/projects")}
          className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[12.5px] font-medium text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
        >
          <Folder className="h-3.5 w-3.5" />
          Projects
          {projects.length > 0 && (
            <span className="ml-auto text-[11px] text-muted-fg/60">{projects.length}</span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-fg/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-transparent text-[13px] text-foreground placeholder:text-muted-fg/70 focus:outline-none focus:bg-surface-2 transition-colors"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <MessageSquare className="h-7 w-7 text-muted-fg/30 mx-auto mb-3" />
            <p className="text-[13px] text-muted-fg">No conversations yet</p>
            <p className="text-[11px] text-muted-fg/60 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-3">
              <div className="px-3 py-1.5 text-[11px] font-medium text-muted-fg/70">{label}</div>
              <div className="space-y-0.5">
                {items.map((conv) => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoverId(conv.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setActive(conv.id)}
                    className={cn(
                      "group relative flex items-center gap-2 px-3 h-9 rounded-lg cursor-pointer transition-all duration-150 hover:translate-x-0.5",
                      activeId === conv.id
                        ? "bg-surface-2 text-foreground"
                        : "text-muted-fg hover:text-foreground hover:bg-surface-2/60"
                    )}
                  >
                    <p className="flex-1 min-w-0 text-[13px] truncate">{conv.title}</p>
                    {hoverId === conv.id && (
                      <div className="flex items-center -mr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const md = conversationToMarkdown(conv.title, conv.messages);
                            downloadText(
                              `${conv.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 50) || "chat"}.md`,
                              md,
                              "text/markdown"
                            );
                          }}
                          className="p-1 rounded hover:bg-surface-3 hover:text-foreground transition-all duration-150 active:scale-90"
                          title="Export as markdown"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/15 hover:text-destructive transition-all duration-150 active:scale-90"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-0.5">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-[0.98]"
        >
          <Settings className="h-4 w-4" />
          Provider settings
        </button>
        {user && (
          <div className="flex items-center gap-2.5 px-2 pt-2 mt-1 border-t border-border">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg text-[12px] font-semibold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[11px] text-muted-fg truncate">
                {mode === "cloud" ? user.email : "Local guest"}
              </p>
            </div>
            {mode === "cloud" ? (
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-muted-fg hover:text-destructive hover:bg-destructive/10 transition-all duration-150 active:scale-90"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="p-1.5 rounded-lg text-muted-fg hover:text-accent hover:bg-surface-2 transition-all duration-150 active:scale-90"
                title="Sign in to sync"
              >
                <LogIn className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
