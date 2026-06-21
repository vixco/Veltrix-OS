"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Folder, Trash2, Settings, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useProjectStore, type Project } from "@/lib/project-store";
import { useChatStore } from "@/lib/store";
import { ClaudeLogo } from "@/components/claude-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PROJECT_ICONS = ["folder", "rocket", "code", "design", "brain", "target", "book", "heart"];
const PROJECT_COLORS = ["#c6613f", "#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2", "#db2777"];

export default function ProjectsPage() {
  const router = useRouter();
  const { user, initialized, init } = useAuthStore();
  const { projects, load, create, remove, setActive } = useProjectStore();
  const conversations = useChatStore((s) => s.conversations);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [newIcon, setNewIcon] = useState(PROJECT_ICONS[0]);

  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  useEffect(() => {
    if (initialized && user) load();
  }, [user, initialized, load]);

  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [user, initialized, router]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const project = await create({
      title: newTitle.trim(),
      description: newDesc.trim(),
      color: newColor,
      icon: newIcon,
    });
    setShowCreate(false);
    setNewTitle("");
    setNewDesc("");
    setActive(project.id);
    router.push(`/projects/${project.id}`);
  };

  if (!initialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ClaudeLogo className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all duration-150 active:scale-90"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
            className="bg-accent text-accent-fg hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Create dialog */}
        {showCreate && (
          <div className="mb-6 rounded-2xl border border-border bg-surface p-6 animate-slide-up">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Project name"
              className="w-full h-11 px-3 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-fg/60 focus:border-border-hover focus:outline-none mb-3"
              autoFocus
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-fg/60 focus:border-border-hover focus:outline-none mb-3 resize-none"
            />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[13px] text-muted-fg">Color:</span>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn("h-6 w-6 rounded-full transition-transform", newColor === c && "ring-2 ring-offset-2 ring-offset-surface ring-foreground scale-110")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={handleCreate} className="bg-accent text-accent-fg hover:bg-accent-hover">
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Projects grid */}
        {projects.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Folder className="h-12 w-12 text-muted-fg/30 mb-4" />
            <p className="text-[15px] text-muted-fg">No projects yet</p>
            <p className="text-[13px] text-muted-fg/60 mt-1">Create a project to organize your conversations</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((project) => {
              const convCount = project.conversationIds.length;
              return (
                <div
                  key={project.id}
                  className="group relative rounded-2xl border border-border bg-surface hover:border-border-hover hover:bg-surface-2 transition-all p-5 cursor-pointer"
                  onClick={() => {
                    setActive(project.id);
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: project.color }}
                    >
                      <Folder className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-foreground truncate">{project.title}</h3>
                      {project.description && (
                        <p className="text-[13px] text-muted-fg mt-0.5 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(project.id);
                      }}
                      className="p-1.5 rounded-lg text-muted-fg hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-fg/70">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {convCount} {convCount === 1 ? "conversation" : "conversations"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
