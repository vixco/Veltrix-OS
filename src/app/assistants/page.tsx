"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Sparkles, Save, X, FileText, Globe, Monitor, Terminal, ImageIcon } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAssistantStore, type Assistant, type AssistantCapabilities, DEFAULT_ASSISTANT_CAPS } from "@/lib/assistant-store";
import { ClaudeLogo } from "@/components/claude-logo";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MODES, type WorkMode } from "@/lib/modes";

const EMOJIS = ["✨","🤖","📝","💻","🎨","📊","🧠","🚀","🔬","📚","🎯","🛠️","🦾","📐","🌍","🧪"];

function emptyDraft(): Omit<Assistant, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "",
    description: "",
    emoji: "✨",
    systemPrompt: "",
    capabilities: { ...DEFAULT_ASSISTANT_CAPS },
    knowledge: [],
  };
}

export default function AssistantsPage() {
  const router = useRouter();
  const { user, initialized, init } = useAuthStore();
  const { assistants, upsert, remove, setDefault, defaultAssistantId } = useAssistantStore();
  const [editing, setEditing] = useState<false | "new" | Assistant>(false);
  const [draft, setDraft] = useState(emptyDraft());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!initialized) init(); }, [initialized, init]);
  useEffect(() => { if (initialized && !user) router.replace("/login"); }, [user, initialized, router]);

  const startNew = () => { setDraft(emptyDraft()); setEditing("new"); };
  const startEdit = (a: Assistant) => { setDraft({ ...a }); setEditing(a); };

  const save = () => {
    if (!draft.name.trim()) return;
    const id = upsert({ ...draft, id: typeof editing === "object" ? editing.id : undefined });
    if (!defaultAssistantId) setDefault(id);
    setEditing(false);
  };

  const addKnowledge = async (files: FileList | null) => {
    if (!files) return;
    const next = [...draft.knowledge];
    for (const f of Array.from(files)) {
      if (f.size > 256 * 1024) continue;
      const text = await f.text();
      next.push({ filename: f.name, text });
    }
    setDraft({ ...draft, knowledge: next });
  };
  const removeKnowledge = (i: number) => setDraft({ ...draft, knowledge: draft.knowledge.filter((_, idx) => idx !== i) });

  const toggleCap = (key: keyof AssistantCapabilities) =>
    setDraft({ ...draft, capabilities: { ...draft.capabilities, [key]: !draft.capabilities[key] } });

  if (!initialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ClaudeLogo className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 border-b border-border bg-surface/80 backdrop-blur">
        <button onClick={() => router.push("/")} className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-colors" title="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[15px] font-semibold text-foreground">Assistants</h1>
        <span className="text-[12px] text-muted-fg">Custom GPTs for tailored chats</span>
        <div className="ml-auto">
          <Button variant="primary" size="sm" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-4 py-6">
        {editing === false ? (
          <>
            <button
              onClick={() => setDefault(null)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-150 mb-3",
                !defaultAssistantId ? "border-accent/40 bg-accent/5" : "border-border bg-surface hover:bg-surface-2"
              )}
            >
              <div className="h-10 w-10 rounded-xl bg-surface-2 flex items-center justify-center text-lg shrink-0">⚙️</div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[14px] font-medium text-foreground">Default</p>
                <p className="text-[12.5px] text-muted-fg truncate">No custom assistant — uses your global preferences and instructions.</p>
              </div>
              {!defaultAssistantId && <span className="text-[11px] text-accent font-medium">Active</span>}
            </button>

            {assistants.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-surface-2 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-accent" />
                </div>
                <p className="text-[15px] font-medium text-foreground">No assistants yet</p>
                <p className="text-[13px] text-muted-fg mt-1 max-w-[420px] mx-auto">
                  Build a reusable assistant with its own instructions, knowledge files, and tool set — then pick it for any chat.
                </p>
                <Button variant="primary" size="sm" className="mt-4" onClick={startNew}>
                  <Plus className="h-3.5 w-3.5" /> Create assistant
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assistants.map((a) => (
                  <div key={a.id} className="group rounded-2xl border border-border bg-surface p-4 hover:border-border-hover hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-surface-2 flex items-center justify-center text-xl shrink-0">{a.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-foreground truncate">{a.name}</p>
                          {defaultAssistantId === a.id && <span className="text-[10px] text-accent font-medium px-1.5 py-0.5 rounded bg-accent/10">Default</span>}
                        </div>
                        <p className="text-[12.5px] text-muted-fg line-clamp-2 mt-0.5">{a.description || a.systemPrompt.slice(0, 90) || "No instructions yet."}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {a.capabilities.web && <Cap icon={Globe} label="Web" />}
                          {a.capabilities.browser && <Cap icon={Monitor} label="Browser" />}
                          {a.capabilities.host && <Cap icon={Terminal} label="Host" />}
                          {a.capabilities.image && <Cap icon={ImageIcon} label="Image" />}
                          {a.knowledge.length > 0 && <span className="text-[10.5px] text-muted-fg flex items-center gap-1"><FileText className="h-3 w-3" />{a.knowledge.length}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 -mr-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDefault(defaultAssistantId === a.id ? null : a.id)}>
                        {defaultAssistantId === a.id ? "Unset default" : "Set default"}
                      </Button>
                      <button onClick={() => { if (confirm("Delete " + a.name + "?")) remove(a.id); }} className="ml-auto p-1.5 rounded-lg text-muted-fg hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-foreground">{typeof editing === "object" ? "Edit assistant" : "New assistant"}</h2>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0">
                  <label className="block text-[11px] font-medium text-muted-fg mb-1.5">Icon</label>
                  <div className="h-11 w-11 rounded-xl bg-surface-2 flex items-center justify-center text-xl">{draft.emoji}</div>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-muted-fg mb-1.5">Name</label>
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Code Reviewer" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((em) => (
                  <button key={em} onClick={() => setDraft({ ...draft, emoji: em })} className={cn("h-8 w-8 rounded-lg text-lg flex items-center justify-center transition-colors", draft.emoji === em ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-surface-2")}>{em}</button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-fg mb-1.5">Description</label>
                <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What does this assistant do?" />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-fg mb-1.5">System instructions</label>
                <Textarea value={draft.systemPrompt} onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })} placeholder="You are a meticulous code reviewer. Focus on correctness, security, and readability." rows={6} className="min-h-[140px]" />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-fg mb-1.5">Default mode</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(MODES) as WorkMode[]).map((m) => (
                    <button key={m} onClick={() => setDraft({ ...draft, mode: draft.mode === m ? undefined : m })} className={cn("px-3 h-8 rounded-lg text-[12.5px] font-medium transition-colors", (draft.mode || "chat") === m ? "bg-accent/15 text-accent ring-1 ring-accent/40" : "bg-surface-2 text-muted-fg hover:text-foreground")}>{MODES[m].label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-fg mb-1.5">Tools</label>
                <div className="grid grid-cols-2 gap-2">
                  <CapToggle icon={Globe} label="Web search" on={draft.capabilities.web} onClick={() => toggleCap("web")} />
                  <CapToggle icon={Monitor} label="Real browser" on={draft.capabilities.browser} onClick={() => toggleCap("browser")} />
                  <CapToggle icon={Terminal} label="Host files & shell" on={draft.capabilities.host} onClick={() => toggleCap("host")} />
                  <CapToggle icon={ImageIcon} label="Image generation" on={draft.capabilities.image} onClick={() => toggleCap("image")} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-fg mb-1.5">Knowledge files</label>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { addKnowledge(e.target.files); e.target.value = ""; }} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Plus className="h-3.5 w-3.5" /> Add file</Button>
                <p className="text-[11px] text-muted-fg mt-1.5">Text files up to 256 KB are inlined into every prompt for this assistant.</p>
                {draft.knowledge.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {draft.knowledge.map((k, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border">
                        <FileText className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                        <span className="text-[12.5px] text-foreground truncate flex-1">{k.filename}</span>
                        <span className="text-[10.5px] text-muted-fg">{(k.text.length / 1024).toFixed(1)} KB</span>
                        <button onClick={() => removeKnowledge(i)} className="p-0.5 rounded text-muted-fg hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={save} disabled={!draft.name.trim()}><Save className="h-3.5 w-3.5" /> Save assistant</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Cap({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="text-[10.5px] text-muted-fg flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-2">
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

function CapToggle({ icon: Icon, label, on, onClick }: { icon: any; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2.5 px-3 h-10 rounded-lg border transition-colors", on ? "border-accent/40 bg-accent/5 text-foreground" : "border-border bg-surface-2 text-muted-fg hover:text-foreground")}>
      <Icon className={cn("h-4 w-4", on ? "text-accent" : "text-muted-fg")} />
      <span className="text-[12.5px] font-medium flex-1 text-left">{label}</span>
      <span className={cn("h-4 w-7 rounded-full p-0.5 transition-colors relative", on ? "bg-accent" : "bg-surface-3")}>
        <span className={cn("block h-3 w-3 rounded-full bg-white transition-transform", on ? "translate-x-3" : "translate-x-0")} />
      </span>
    </button>
  );
}
