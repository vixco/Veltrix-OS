import { NextRequest, NextResponse } from "next/server";
import { Composio } from "@composio/core";
import { guardHostRequest } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Gated by the shared host guard (env gate + strict same-origin + token check),
// exactly like every other /api/host/* route (exec/fs/browser/web).

export async function POST(req: NextRequest) {
  const denied = guardHostRequest(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const userApiKey = body.composioApiKey;
    const apiKey = userApiKey || process.env.COMPOSIO_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Composio API key is missing. Please enter it in your Veltrix settings or set COMPOSIO_API_KEY in the server environment." },
        { status: 400 }
      );
    }

    const composio = new Composio({ apiKey });
    const userId = body.userId || "veltrix_user";

    // -------------------------------------------------------------
    // Action: List connected accounts (integrations)
    // -------------------------------------------------------------
    if (action === "list_connections") {
      try {
        const response = await composio.connectedAccounts.list({ userIds: [userId] });
        return NextResponse.json({ ok: true, connections: response.items || [] });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
      }
    }

    // -------------------------------------------------------------
    // Action: Create connection / link account
    // -------------------------------------------------------------
    if (action === "get_auth_link") {
      const authConfigId = body.authConfigId || body.appName;
      if (!authConfigId) {
        return NextResponse.json({ error: "Missing appName/authConfigId to connect" }, { status: 400 });
      }

      try {
        // Start a hosted connection flow
        const connectionRequest = await composio.connectedAccounts.link(
          userId,
          authConfigId,
          body.callbackUrl ? { callbackUrl: body.callbackUrl } : undefined
        );
        return NextResponse.json({ ok: true, redirectUrl: connectionRequest.redirectUrl });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
      }
    }

    // -------------------------------------------------------------
    // Action: List tools/actions for the agent
    // -------------------------------------------------------------
    if (action === "list_tools") {
      try {
        // 1. Get active connections to see which apps are enabled for this user
        const activeConnections = await composio.connectedAccounts.list({
          userIds: [userId],
        });

        const activeAppSlugs = (activeConnections.items || [])
          .filter((conn) => conn.status === "ACTIVE")
          .map((conn) => conn.toolkit?.slug || (conn as any).appUniqueId || (conn as any).appName)
          .filter(Boolean); // e.g., "github", "slack"

        if (activeAppSlugs.length === 0) {
          return NextResponse.json({ ok: true, tools: [] });
        }

        // 2. Fetch all tools for the active toolkits
        const allTools: any[] = [];
        for (const appSlug of activeAppSlugs) {
          try {
            // list tools for this toolkit
            const toolsResp = await composio.tools.getRawComposioTools({ toolkits: [appSlug] });
            if (Array.isArray(toolsResp)) {
              allTools.push(...toolsResp);
            }
          } catch (e) {
            console.error(`Error loading tools for app ${appSlug}:`, e);
          }
        }

        return NextResponse.json({ ok: true, tools: allTools });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
      }
    }

    // -------------------------------------------------------------
    // Action: Execute an action
    // -------------------------------------------------------------
    if (action === "execute_action") {
      const actionName = body.actionName;
      const args = body.arguments || {};

      if (!actionName) {
        return NextResponse.json({ error: "Missing actionName to execute" }, { status: 400 });
      }

      try {
        const result = await composio.tools.execute(actionName, {
          userId,
          arguments: args,
        });
        return NextResponse.json({ ok: true, output: result });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
