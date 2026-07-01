import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { guardHostRequest } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Run a command on the host machine. No API key required.
// Body: { command: string, cwd?: string, timeoutMs?: number, env?: Record<string,string> }
//
// Safety: this executes arbitrary shell commands on the host, which is exactly
// the point ("access to everything") but is dangerous if the server is ever
// exposed publicly. Access is enforced by the shared host guard
// (src/lib/host-guard.ts): env gate + strict same-origin (missing Origin AND
// Referer is rejected) + optional VELTRIX_HOST_TOKEN shared secret.

export async function POST(req: NextRequest) {
  const denied = guardHostRequest(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const command = String(body.command || "");
    const cwd = body.cwd ? String(body.cwd) : undefined;
    const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 30000, 1000), 120000);
    const env = body.env && typeof body.env === "object" ? { ...process.env, ...body.env } : undefined;
    if (!command.trim()) return NextResponse.json({ error: "Missing command" }, { status: 400 });

    const isWin = process.platform === "win32";
    const shell = isWin ? process.env.ComSpec || "cmd.exe" : "/bin/sh";
    const args = isWin ? ["/c", command] : ["-c", command];

    const result: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean } = {
      stdout: "", stderr: "", exitCode: null, timedOut: false,
    };

    await new Promise<void>((resolve) => {
      const child = spawn(shell, args, { cwd, env: env as any, windowsHide: true });
      const cap = 2_000_000;
      child.stdout.on("data", (d) => {
        const s = d.toString();
        if (result.stdout.length < cap) result.stdout += s.slice(0, cap - result.stdout.length);
      });
      child.stderr.on("data", (d) => {
        const s = d.toString();
        if (result.stderr.length < cap) result.stderr += s.slice(0, cap - result.stderr.length);
      });
      child.on("error", (err) => {
        result.stderr += "\n[spawn error] " + (err as any).message;
        resolve();
      });
      child.on("close", (code) => {
        result.exitCode = code;
        resolve();
      });
      const timer = setTimeout(() => {
        result.timedOut = true;
        try { child.kill("SIGKILL"); } catch {}
      }, timeoutMs);
      child.on("exit", () => clearTimeout(timer));
    });

    return NextResponse.json({
      platform: process.platform,
      cwd: cwd || process.cwd(),
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
