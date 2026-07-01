import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { guardHostRequest } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Host filesystem access (no API key). Actions:
//   { action: "list", path? }            -> directory entries (name, kind, size)
//   { action: "read", path, maxChars? }  -> file text (capped)
//   { action: "stat", path }             -> { exists, isDir, size, mtime }
//   { action: "write", path, content }   -> write text file
//   { action: "mkdir", path }            -> create a directory
//   { action: "delete", path }           -> delete a file or directory (recursive)
//   { action: "rename", from, to }       -> rename/move a path
// Access is enforced by the shared host guard (src/lib/host-guard.ts).
//
// Optional jail: set VELTRIX_FS_ROOT to confine every path to that directory.
// Regardless of the jail, recursive deletion of a filesystem/drive root is
// always refused.

// Resolve VELTRIX_FS_ROOT once (if configured) so paths can be confined to it.
const FS_ROOT = process.env.VELTRIX_FS_ROOT ? path.resolve(process.env.VELTRIX_FS_ROOT) : null;

/** Throw if the jail is enabled and `target` escapes it. */
function assertInsideRoot(target: string) {
  if (!FS_ROOT) return;
  const rel = path.relative(FS_ROOT, target);
  const escapes = rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel);
  if (target !== FS_ROOT && escapes) {
    throw new Error(`Path is outside the allowed root (VELTRIX_FS_ROOT): ${target}`);
  }
}

/** True when `p` is a filesystem root or a Windows drive root (e.g. "/", "C:\\"). */
function isFsRoot(p: string): boolean {
  const resolved = path.resolve(p);
  if (resolved === path.parse(resolved).root) return true;
  // Windows drive root with or without trailing separator ("C:", "C:\").
  if (/^[A-Za-z]:[\\/]?$/.test(resolved)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const denied = guardHostRequest(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const rawPath = String(body.path || "");
    const target = rawPath ? path.resolve(rawPath) : (FS_ROOT || process.cwd());
    if (action !== "home") assertInsideRoot(target);

    if (action === "list") {
      const entries = await fs.readdir(target, { withFileTypes: true });
      const out = [];
      for (const e of entries) {
        let size = 0;
        try { if (!e.isDirectory()) size = (await fs.stat(path.join(target, e.name))).size; } catch {}
        out.push({ name: e.name, kind: e.isDirectory() ? "dir" : "file", size });
      }
      return NextResponse.json({ path: target, entries: out });
    }

    if (action === "read") {
      const maxChars = Math.min(Math.max(Number(body.maxChars) || 60000, 200), 400000);
      const data = await fs.readFile(target, "utf8");
      return NextResponse.json({ path: target, content: data.slice(0, maxChars), truncated: data.length > maxChars });
    }

    if (action === "stat") {
      try {
        const st = await fs.stat(target);
        return NextResponse.json({ path: target, exists: true, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs });
      } catch {
        return NextResponse.json({ path: target, exists: false });
      }
    }

    if (action === "write") {
      const content = String(body.content ?? "");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
      return NextResponse.json({ path: target, written: true, bytes: Buffer.byteLength(content) });
    }

    if (action === "mkdir") {
      await fs.mkdir(target, { recursive: true });
      return NextResponse.json({ path: target, created: true });
    }

    if (action === "delete") {
      // Never allow a recursive delete of a filesystem / drive root.
      if (isFsRoot(target)) {
        return NextResponse.json({ path: target, deleted: false, error: "Refusing to delete a filesystem root" }, { status: 400 });
      }
      const st = await fs.stat(target).catch(() => null);
      if (!st) return NextResponse.json({ path: target, deleted: false, error: "Not found" }, { status: 404 });
      if (st.isDirectory()) await fs.rm(target, { recursive: true, force: true });
      else await fs.unlink(target);
      return NextResponse.json({ path: target, deleted: true });
    }

    if (action === "rename") {
      const from = path.resolve(String(body.from || ""));
      const to = path.resolve(String(body.to || ""));
      if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
      assertInsideRoot(from);
      assertInsideRoot(to);
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
      return NextResponse.json({ from, to, renamed: true });
    }

    if (action === "home") {
      return NextResponse.json({ path: process.cwd(), home: os.homedir() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
