"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, FolderPlus, FilePlus, Home, Folder, FileText, FileCode,
  FileImage, Trash2, Pencil, Save, X, Download, ChevronRight, HardDrive, AlertTriangle,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { usePreferences } from "@/lib/preferences";
import { ClaudeLogo } from "@/components/claude-logo";
import { cn, downloadText } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Entry { name: string; kind: "dir" | "file"; size: number; }
interface FsResp { path: string; entries?: Entry[]; content?: string; error?: string; }

async function fsApi(body: Record<string, any>): Promise<any> {
  const res = await fetch("/api/host/fs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text.slice(0, 500) }; }
}

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png","jpg","jpeg","gif","webp","svg","bmp","ico"].includes(ext)) return FileImage;
  if (["ts","tsx","js","jsx","json","py","rs","go","c","cpp","cs","java","rb","php","sh","mjs","css","html","yml","yaml","toml","xml","md"].includes(ext)) return FileCode;
  return FileText;
}

function humanSize(n: number): string {
  if (!n) return "-";
  const u = ["B","KB","MB","GB","TB"]; let i = 0; let s = n;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return s >= 100 ? s.toFixed(0) + " " + u[i] : s.toFixed(1) + " " + u[i];
}

const TEXTUAL = /\.(txt|md|json|js|jsx|ts|tsx|mjs|cjs|css|html|htm|xml|yml|yaml|toml|ini|env|sh|py|rs|go|c|cpp|h|hpp|cs|java|rb|php|sql|csv|log|svg|gitignore|prettierrc|eslintrc|txt)$/i;

export default function FilesPage() {
  return (
    <AuthGuard>
      <FilesApp />
    </AuthGuard>
  );
}

function FilesApp() {
  const router = useRouter();
  const hostAccess = usePreferences((s) => s.capabilities?.hostAccess ?? true);
  const [cwd, setCwd] = useState<string>("");
  const [home, setHome] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ path: string; content: string; original: string; dirty: boolean } | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true); setError(null); setSelected(null);
    const r: FsResp = await fsApi({ action: "list", path: dir });
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    setCwd(r.path);
    const list = (r.entries || []).slice().sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    setEntries(list);
  }, []);

  useEffect(() => {
    (async () => {
      const h = await fsApi({ action: "home" });
      if (h.home) setHome(h.home);
      loadDir(h.home || h.path || "");
    })();
  }, [loadDir]);

  const crumbs = (() => {
    const isWin = /^[A-Za-z]:[\\/]/.test(cwd) || cwd.startsWith("\\");
    const parts = cwd.split(/[\\/]/).filter(Boolean);
    const out: { label: string; path: string }[] = [];
    let acc = "";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      acc = acc ? acc + (isWin ? "\\" : "/") + p : isWin ? p.toUpperCase() : "/" + p;
      out.push({ label: p, path: isWin && i === 0 ? p.toUpperCase() : acc });
    }
    if (out.length === 0 && cwd) out.push({ label: cwd, path: cwd });
    return out;
  })();

  async function openEntry(e: Entry) {
    const full = cwd + (/[\\/]$/.test(cwd) ? "" : (cwd.includes("\\") ? "\\" : "/")) + e.name;
    if (e.kind === "dir") { loadDir(full); return; }
    if (!TEXTUAL.test(e.name) && e.size > 2_000_000) {
      setError("This file is large or binary; only text files under ~2 MB can be opened in the editor.");
      return;
    }
    setEditorLoading(true);
    const r: FsResp = await fsApi({ action: "read", path: full, maxChars: 400000 });
    setEditorLoading(false);
    if (r.error) { setError(r.error); return; }
    setEditor({ path: r.path, content: r.content || "", original: r.content || "", dirty: false });
  }

  async function saveEditor() {
    if (!editor) return;
    const r = await fsApi({ action: "write", path: editor.path, content: editor.content });
    if (r.error) { setError(r.error); return; }
    setEditor({ ...editor, original: editor.content, dirty: false });
  }

  async function doDelete(p: string) {
    const r = await fsApi({ action: "delete", path: p });
    setConfirmDelete(null);
    if (r.error) { setError(r.error); return; }
    loadDir(cwd);
  }

  async function doCreate(kind: "file" | "folder") {
    const name = newName.trim();
    if (!name) { setCreating(null); return; }
    const sep = cwd.includes("\\") ? "\\" : "/";
    const full = cwd.replace(/[\\/]+$/, "") + sep + name;
    if (kind === "folder") {
      const r = await fsApi({ action: "mkdir", path: full });
      if (r.error) { setError(r.error); }
    } else {
      const r = await fsApi({ action: "write", path: full, content: "" });
      if (r.error) { setError(r.error); }
    }
    setNewName(""); setCreating(null);
    loadDir(cwd);
  }

  async function doRename() {
    if (!renaming || !renameTo.trim()) { setRenaming(null); return; }
    const sep = cwd.includes("\\") ? "\\" : "/";
    const from = cwd.replace(/[\\/]+$/, "") + sep + renaming;
    const to = cwd.replace(/[\\/]+$/, "") + sep + renameTo.trim();
    const r = await fsApi({ action: "rename", from, to });
    setRenaming(null); setRenameTo("");
    if (r.error) { setError(r.error); }
    loadDir(cwd);
  }

  if (!hostAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <TopBar onBack={() => router.push("/")} />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
          <h1 className="font-serif text-2xl mb-2">Host access is off</h1>
          <p className="text-muted-fg text-[14px]">
            The Files app needs host access to browse this machine. Turn it on in Settings &rarr; Capabilities &rarr; Host access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopBar onBack={() => router.push("/")} />

      {/* Toolbar */}
      <div className="border-b border-border bg-bg-sidebar/50">
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-2">
          <button onClick={() => home && loadDir(home)} title="Home" className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all active:scale-90">
            <Home className="h-4 w-4" />
          </button>
          <button onClick={() => loadDir(cwd)} title="Refresh" className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all active:scale-90">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          {/* Breadcrumb / address bar */}
          <div className="flex-1 min-w-0 flex items-center gap-0.5 h-9 px-2 rounded-lg bg-surface border border-border overflow-x-auto">
            {crumbs.length === 0 && <span className="text-[13px] text-muted-fg px-1">{cwd || "..."}</span>}
            {crumbs.map((c, i) => (
              <div key={i} className="flex items-center shrink-0">
                <button
                  onClick={() => loadDir(c.path)}
                  className={cn("px-1.5 py-0.5 rounded text-[13px] hover:bg-surface-2 transition-colors",
                    i === crumbs.length - 1 ? "text-foreground font-medium" : "text-muted-fg hover:text-foreground")}
                >
                  {c.label}
                </button>
                {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-fg/60" />}
              </div>
            ))}
          </div>

          <button onClick={() => { setCreating("folder"); setNewName(""); }} title="New folder" className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all active:scale-95">
            <FolderPlus className="h-4 w-4" />
          </button>
          <button onClick={() => { setCreating("file"); setNewName(""); }} title="New file" className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[13px] text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all active:scale-95">
            <FilePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 mx-auto w-full max-w-6xl px-4 py-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-0.5 rounded hover:bg-destructive/20"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {creating && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
            <span className="text-[13px] text-muted-fg">{creating === "folder" ? "New folder" : "New file"}:</span>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doCreate(creating); if (e.key === "Escape") setCreating(null); }}
              placeholder={creating === "folder" ? "folder-name" : "filename.txt"}
              className="flex-1 h-8 px-2 rounded-md bg-surface border border-border text-[13px] focus:outline-none focus:border-accent"
            />
            <Button size="sm" onClick={() => doCreate(creating)}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(null)}>Cancel</Button>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <ClaudeLogo className="h-7 w-7 text-accent animate-pulse" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Folder className="h-9 w-9 text-muted-fg/30 mb-3" />
              <p className="text-[14px] text-muted-fg">This folder is empty</p>
              <p className="text-[12px] text-muted-fg/70 mt-1">Create a file or folder from the toolbar above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 p-2">
              {entries.map((e) => {
                const Icon = e.kind === "dir" ? Folder : iconFor(e.name);
                const full = cwd.replace(/[\\/]+$/, "") + (cwd.includes("\\") ? "\\" : "/") + e.name;
                const isSel = selected === e.name;
                return (
                  <div
                    key={e.name}
                    onClick={() => setSelected(e.name)}
                    onDoubleClick={() => openEntry(e)}
                    className={cn(
                      "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all",
                      isSel ? "bg-surface-2 ring-1 ring-accent/40" : "hover:bg-surface-2/60"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", e.kind === "dir" ? "text-accent" : "text-muted-fg")} />
                    <div className="flex-1 min-w-0">
                      {renaming === e.name ? (
                        <input
                          autoFocus
                          value={renameTo}
                          onChange={(ev) => setRenameTo(ev.target.value)}
                          onClick={(ev) => ev.stopPropagation()}
                          onKeyDown={(ev) => { if (ev.key === "Enter") doRename(); if (ev.key === "Escape") setRenaming(null); }}
                          className="w-full h-6 px-1.5 rounded bg-surface border border-accent text-[13px] focus:outline-none"
                        />
                      ) : (
                        <p className="text-[13px] text-foreground truncate">{e.name}</p>
                      )}
                      <p className="text-[11px] text-muted-fg/70">{e.kind === "dir" ? "Folder" : humanSize(e.size)}</p>
                    </div>
                    {isSel && renaming !== e.name && (
                      <div className="flex items-center -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {e.kind === "file" && (
                          <>
                            <button onClick={(ev) => { ev.stopPropagation(); openEntry(e); }} title="Open" className="p-1 rounded hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={(ev) => { ev.stopPropagation(); const r = fsApi({ action: "read", path: full, maxChars: 400000 }); r.then((x) => { if (!x.error) downloadText(e.name, x.content || "", ""); }); }} title="Download" className="p-1 rounded hover:bg-surface-3 hover:text-foreground"><Download className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                        <button onClick={(ev) => { ev.stopPropagation(); setRenaming(e.name); setRenameTo(e.name); }} title="Rename" className="p-1 rounded hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setConfirmDelete(full); }} title="Delete" className="p-1 rounded hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-fg/70">
          <HardDrive className="h-3.5 w-3.5" />
          <span className="truncate">{entries.length} items &middot; {cwd}</span>
        </div>
      </div>

      {/* Editor modal */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => editor.dirty ? null : setEditor(null)}>
          <div className="flex flex-col w-full max-w-3xl h-[80vh] rounded-xl border border-border bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-3 h-11 border-b border-border bg-bg-sidebar/50">
              <FileText className="h-4 w-4 text-accent shrink-0" />
              <span className="text-[13px] font-medium truncate flex-1">{editor.path.split(/[\\/]/).pop()}</span>
              {editor.dirty && <span className="text-[11px] text-warning">Unsaved</span>}
              <Button size="sm" onClick={saveEditor} disabled={!editor.dirty}><Save className="h-3.5 w-3.5" />Save</Button>
              <button onClick={() => setEditor(null)} className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-3 py-1.5 border-b border-border text-[11px] text-muted-fg/70 truncate">{editor.path}</div>
            {editorLoading ? (
              <div className="flex-1 flex items-center justify-center"><ClaudeLogo className="h-6 w-6 text-accent animate-pulse" /></div>
            ) : (
              <textarea
                value={editor.content}
                onChange={(e) => setEditor({ ...editor, content: e.target.value, dirty: e.target.value !== editor.original })}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveEditor(); } }}
                spellCheck={false}
                className="flex-1 w-full resize-none bg-background text-foreground font-mono text-[13px] leading-relaxed p-4 focus:outline-none"
              />
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <h3 className="font-medium text-[15px]">Delete permanently?</h3>
            </div>
            <p className="text-[13px] text-muted-fg mb-4">
              {confirmDelete.split(/[\\/]/).pop()} will be deleted from the host. Folders are removed recursively. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => doDelete(confirmDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="border-b border-border bg-bg-sidebar">
      <div className="mx-auto max-w-6xl px-4 h-12 flex items-center gap-2.5">
        <button onClick={onBack} className="p-2 rounded-lg text-muted-fg hover:text-foreground hover:bg-surface-2 transition-all active:scale-90" title="Back to chat">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <ClaudeLogo className="h-5 w-5 text-accent" />
        <h1 className="font-serif text-[18px] text-foreground">Files</h1>
        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-muted-fg">Host desktop</span>
      </div>
    </div>
  );
}
