"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Plus, Trash2, Search, Sparkles, Globe, Clock, Star } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useProjectStore } from "@/lib/project-store";
import { useMemoryStore, type MemoryNode, type MemoryKind } from "@/lib/memory-store";
import { consolidate } from "@/lib/memory-engine";
import { ClaudeLogo } from "@/components/claude-logo";
import { MemoryGraph } from "@/components/memory-graph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, initialized, init } = useAuthStore();
  const { projects, load } = useProjectStore();
  const nodes = useMemoryStore((s) => s.nodes);
  const links = useMemoryStore((s) => s.links);
  const createMem = useMemoryStore((s) => s.create);
  const updateMem = useMemoryStore((s) => s.update);
  const removeMem = useMemoryStore((s) => s.remove);
  const promote = useMemoryStore((s) => s.promote);
  const decay = useMemoryStore((s) => s.decay);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MemoryKind | "global">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newKind, setNewKind] = useState<MemoryKind>("long");
  const [newTags, setNewTags] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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
    decay();
  }, [decay]);

  const projectNodes = useMemo(
    () => nodes.filter((n) => n.projectId === id || n.projectId === "global"),
    [nodes, id]
  );

  const projectLinks = useMemo(
    () => links.filter((l) => projectNodes.some((n) => n.id === l.from) && projectNodes.some((n) => n.id === l.to)),
    [links, projectNodes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projectNodes
      .filter((n) => {
        if (filter === "all") return true;
        if (filter === "global") return n.projectId === "global";
        return n.kind === filter;
      })
      .filter((n) =>
        q
          ? n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.includes(q))
          : true
      )
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "long" ? -1 : 1;
        return b.lastAccessed - a.lastAccessed;
      });
  }, [projectNodes, query, filter]);

  const selected = selectedId ? useMemoryStore.getState().byId(selectedId) || null : null;

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMem({
      projectId: id,
      title: newTitle.trim(),
      content: newContent.trim(),
      kind: newKind,
      tags: newTags.split(/\s+/).filter(Boolean),
      strength: newKind === "long" ? 0.7 : 0.4,
    });
    setNewTitle("");
    setNewContent("");
    setNewTags("");
    setShowAdd(false);
    flash("Memory added");
  };

  const handleConsolidate = () => {
    const res = consolidate(id);
    flash(`Promoted ${res.promoted}, merged ${res.merged}`);
  };

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

  const longCount = projectNodes.filter((n) => n.kind === "long").length;
  const shortCount = projectNodes.filter((n) => n.kind === "short").length;
  const globalCount = projectNodes.filter((n) => n.projectId === "global").length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="flex-1 min-w-0 relative">
        <MemoryGraph
          nodes={projectNodes}
          links={projectLinks}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: project.color }}>
            <Brain className="h-5 w-5" />
          </div>
          <div className="pointer-events-auto">
            <button
              onClick={() => router.push(`/projects/${id}`)}
              className="flex items-center gap-1.5 text-[13px] text-[#9c9a92] hover:text-[#e9e7e0] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {project.title}
            </button>
            <h1 className="text-[17px] font-semibold text-[#e9e7e0] leading-tight">Memory</h1>
          </div>
        </div>
      </div>

      <div className="w-[340px] shrink-0 border-l border-border bg-surface flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-foreground">Brain</span>
              <span className="text-[11px] text-muted-fg/70">{projectNodes.length} nodes</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleConsolidate} title="Promote strong memories + merge duplicates">
              <Sparkles className="h-4 w-4 text-accent" />
              Consolidate
            </Button>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={projectNodes.length} />
            <FilterChip active={filter === "long"} onClick={() => setFilter("long")} label="Long" count={longCount} icon={<Star className="h-3 w-3" />} />
            <FilterChip active={filter === "short"} onClick={() => setFilter("short")} label="Short" count={shortCount} icon={<Clock className="h-3 w-3" />} />
            <FilterChip active={filter === "global"} onClick={() => setFilter("global")} label="Global" count={globalCount} icon={<Globe className="h-3 w-3" />} />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-surface-2 border border-border text-[13px] text-foreground placeholder:text-muted-fg/60 focus:border-border-hover focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="h-4 w-4" />
              Add memory
            </Button>
          </div>
          {showAdd && (
            <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3 space-y-2 animate-slide-up">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (a short label)"
                className="w-full h-9 px-2.5 rounded-lg bg-surface border border-border text-[13px] text-foreground placeholder:text-muted-fg/60 focus:border-border-hover focus:outline-none"
                autoFocus
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="What to remember. Use [[Other Title]] to link memories."
                rows={3}
                className="w-full px-2.5 py-2 rounded-lg bg-surface border border-border text-[13px] text-foreground placeholder:text-muted-fg/60 focus:border-border-hover focus:outline-none resize-none"
              />
              <input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="tags separated by spaces"
                className="w-full h-9 px-2.5 rounded-lg bg-surface border border-border text-[13px] text-foreground placeholder:text-muted-fg/60 focus:border-border-hover focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewKind("long")}
                  className={cn("px-2.5 h-7 rounded-lg text-[12px] border", newKind === "long" ? "bg-accent/15 border-accent/40 text-accent" : "bg-surface border-border text-muted-fg")}
                >Long-term</button>
                <button
                  onClick={() => setNewKind("short")}
                  className={cn("px-2.5 h-7 rounded-lg text-[12px] border", newKind === "short" ? "bg-accent/15 border-accent/40 text-accent" : "bg-surface border-border text-muted-fg")}
                >Short-term</button>
                <Button variant="primary" size="sm" onClick={handleAdd} className="ml-auto bg-accent text-accent-fg hover:bg-accent-hover">
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Brain className="h-8 w-8 text-muted-fg/30 mx-auto mb-2" />
              <p className="text-[13px] text-muted-fg">No memories yet</p>
              <p className="text-[12px] text-muted-fg/60 mt-1">Chat in this project and Veltrix will start remembering.</p>
            </div>
          ) : (
            filtered.map((n) => <MemoryRow key={n.id} node={n} selected={n.id === selectedId} onSelect={() => setSelectedId(n.id)} onPromote={() => promote(n.id)} onRemove={() => { removeMem(n.id); if (selectedId === n.id) setSelectedId(null); }} />)
          )}
        </div>

        {selected && (
          <div className="border-t border-border bg-surface-2 p-3 space-y-2 animate-slide-up max-h-[55%] flex flex-col">
            <div className="flex items-start gap-2">
              <input
                value={selected.title}
                onChange={(e) => updateMem(selected.id, { title: e.target.value })}
                className="flex-1 h-9 px-2 rounded-lg bg-surface border border-border text-[13px] font-medium text-foreground focus:border-border-hover focus:outline-none"
              />
              <button
                onClick={() => { removeMem(selected.id); setSelectedId(null); }}
                className="p-2 rounded-lg text-muted-fg hover:text-destructive hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("px-2 h-6 rounded text-[11px] flex items-center gap-1", selected.kind === "long" ? "bg-accent/15 text-accent" : "bg-surface text-muted-fg")}>
                {selected.kind === "long" ? <Star className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {selected.kind === "long" ? "Long-term" : "Short-term"}
              </span>
              {selected.kind === "short" && (
                <Button variant="ghost" size="sm" onClick={() => promote(selected.id)} className="h-6 px-2 text-[11px]">
                  <Sparkles className="h-3 w-3 text-accent" /> Make long-term
                </Button>
              )}
              {selected.projectId === "global" && (
                <span className="px-2 h-6 rounded text-[11px] flex items-center gap-1 bg-surface text-muted-fg">
                  <Globe className="h-3 w-3" /> global
                </span>
              )}
            </div>
            <textarea
              value={selected.content}
              onChange={(e) => updateMem(selected.id, { content: e.target.value })}
              rows={4}
              className="w-full flex-1 min-h-[80px] px-2.5 py-2 rounded-lg bg-surface border border-border text-[13px] text-foreground focus:border-border-hover focus:outline-none resize-none"
              placeholder="Memory content. Use [[Title]] to link to other memories."
            />
            <input
              value={selected.tags.join(" ")}
              onChange={(e) => updateMem(selected.id, { tags: e.target.value.split(/\s+/).filter(Boolean) })}
              className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-[12px] text-muted-fg focus:border-border-hover focus:outline-none"
              placeholder="tags"
            />
            <p className="text-[11px] text-muted-fg/60">Recalled {selected.recallCount}&times; &middot; strength {Math.round(selected.strength * 100)}%</p>
          </div>
        )}
      </div>

      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground text-background px-3.5 py-2 text-[13px] shadow-lg animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] border transition-colors",
        active ? "bg-accent/15 border-accent/40 text-accent" : "bg-surface-2 border-border text-muted-fg hover:text-foreground"
      )}
    >
      {icon}
      {label}
      <span className="opacity-60">{count}</span>
    </button>
  );
}

function MemoryRow({ node, selected, onSelect, onPromote, onRemove }: { node: MemoryNode; selected: boolean; onSelect: () => void; onPromote: () => void; onRemove: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group rounded-lg border p-2.5 cursor-pointer transition-all",
        selected ? "border-accent/50 bg-accent/10" : "border-transparent hover:bg-surface-2 hover:border-border"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1 h-2 w-2 rounded-full shrink-0",
            node.kind === "long" ? "bg-accent" : node.projectId === "global" ? "bg-[#96b9e6]" : "bg-muted-fg/50"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{node.title}</p>
          <p className="text-[11px] text-muted-fg/70 line-clamp-2 mt-0.5">{node.content.replace(/\[\[|\]\]/g, "")}</p>
          {node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {node.tags.slice(0, 4).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-surface-2 text-muted-fg/80">#{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.kind === "short" && (
            <button onClick={(e) => { e.stopPropagation(); onPromote(); }} className="p-1 rounded text-muted-fg hover:text-accent" title="Promote to long-term">
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 rounded text-muted-fg hover:text-destructive" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}