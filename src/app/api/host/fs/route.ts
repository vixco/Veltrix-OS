import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Host filesystem access (no API key). Actions:
//   { action: "list", path? }            -> directory entries (name, kind, size)
//   { action: "read", path, maxChars? }  -> file text (capped)
//   { action: "stat", path }             -> { exists, isDir, size, mtime }
//   { action: "write", path, content }   -> write text file
// Same dev/production gate as /api/host/exec.

function hostAccessEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.VELTRIX_HOST_ACCESS === "true";
}
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) return true;
  try { return new URL(origin).host === (req.headers.get("host") || ""); } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!hostAccessEnabled()) {
    return NextResponse.json({ error: "Host filesystem access is disabled on this server. Set VELTRIX_HOST_ACCESS=true to enable." }, { status: 403 });
  }
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin host access not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const rawPath = String(body.path || "");
    const target = rawPath ? path.resolve(rawPath) : process.cwd();

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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
