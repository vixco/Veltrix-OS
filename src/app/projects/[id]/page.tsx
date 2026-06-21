"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, MessageSquare, Settings, FileText, Brain } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useProjectStore } from "@/lib/project-store";
import { useChatStore } from "@/lib/store";
import { ClaudeLogo } from "@/components/claude-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, initialized, init } = useAuthStore();
  const { projects, load, update, remove, setActive } = useProjectStore();
  const conversations = useChatStore((s) => s.conversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const setActiveConv = useChatStore((s) => s.setActive);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  useEffect(() => {
    if (initialized && user && projects.length === 0) load();
  }, [user, initialized, load, projects.length]);

  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [user, initialized, router]);

  useEffect(() => {
    if (project) {
      setActive(project.id);
      setEditTitle(project.title);
      setEditDesc(project.description);
      setEditInstructions(project.instructions);
    }
  }, [project?.id]);

  if (!initialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ClaudeLogo className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-fg">Project not found</p>
          <Button variant="ghost" onClick={() => router.push("/projects")} className="mt-3">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const projectConversations = conversations.filter((c) =>
    project.conversationIds.includes(c.id)
  );

  const handleSaveEdit = async () => {
    await update(project.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      instructions: editInstructions.trim(),
    });
    setEditing(false);
  };

  const handleNewChat = () => {
    const convId = createConversation();
    // Add to project
    update(project.id, {
      conversationIds: [...project.conversationIds, convId],
    });
    setActiveConv(convId);
    router.push("/");
  };

  const handleDeleteProject = async () => {
    await remove(project.id);
    router.push("/projects");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/projects")}
            className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: project.color }}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full h-9 px-2 rounded-lg bg-surface-2 border border-border text-base font-semibold text-foreground focus:border-border-hover focus:outline-none"
              />
            ) : (
              <h1 className="text-xl font-semibold text-foreground">{project.title}</h1>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${id}/memory`)}
            className="text-accent hover:text-accent-hover"
            title="Open the memory brain"
          >
            <Brain className="h-4 w-4" />
            Memory
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            <Settings className="h-4 w-4" />
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteProject}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Edit panel */}
        {editing && (
          <div className="rounded-2xl border border-border bg-surface p-5 mb-6 space-y-3 animate-slide-up">
            <div>
              <label className="text-[13px] font-medium text-muted-fg block mb-1.5">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground focus:border-border-hover focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-muted-fg block mb-1.5">Custom Instructions</label>
              <p className="text-[12px] text-muted-fg/70 mb-1.5">These instructions are added to every conversation in this project.</p>
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground focus:border-border-hover focus:outline-none resize-none"
                placeholder="e.g. Always use TypeScript. Focus on performance. We're building a SaaS dashboard..."
              />
            </div>
            <Button variant="primary" onClick={handleSaveEdit} className="bg-accent text-accent-fg hover:bg-accent-hover">
              Save Changes
            </Button>
          </div>
        )}

        {/* Instructions preview (when not editing) */}
        {!editing && project.instructions && (
          <div className="rounded-xl border border-border bg-surface p-4 mb-6">
            <p className="text-[12px] font-medium text-muted-fg uppercase tracking-wide mb-1.5">Custom Instructions</p>
            <p className="text-[13px] text-foreground/80 whitespace-pre-wrap">{project.instructions}</p>
          </div>
        )}

        {/* Conversations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-muted-fg uppercase tracking-wide">Conversations</h2>
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="text-accent hover:text-accent-hover">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {projectConversations.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-fg/30 mx-auto mb-3" />
              <p className="text-[13px] text-muted-fg">No conversations in this project yet</p>
              <p className="text-[12px] text-muted-fg/60 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            projectConversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface hover:bg-surface-2 hover:border-border-hover p-3 cursor-pointer transition-all"
                onClick={() => {
                  setActiveConv(conv.id);
                  router.push("/");
                }}
              >
                <MessageSquare className="h-4 w-4 text-muted-fg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">{conv.title}</p>
                  <p className="text-[12px] text-muted-fg/70">
                    {conv.messages.length} messages
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
