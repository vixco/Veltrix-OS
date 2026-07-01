import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, method, headers, payload } = body;

    if (!target || typeof target !== "string") {
      return new Response(JSON.stringify({ error: "Missing target URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let url: URL;
    try {
      url = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Allow localhost and HTTPS URLs; block HTTP to non-localhost (SSRF protection)
    const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
    if (!isLocal && url.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only HTTPS or localhost targets are allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await fetch(target, {
      method: method || "POST",
      headers: { "Content-Type": "application/json", ...(headers || {}) },
      body: payload ? JSON.stringify(payload) : undefined,
      // Forward the client disconnect so a Stop actually cancels the upstream
      // generation instead of letting it run on silently.
      signal: req.signal,
    });

    const contentType = res.headers.get("content-type") || "application/json";
    // Let the runtime handle transfer-encoding. Setting "chunked" manually can
    // duplicate the upstream header and stall streaming for remote providers.
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target");
  // Auth value arrives in a header (x-proxy-auth), never the query string, so
  // provider API keys are kept out of URLs and access logs.
  const authHeader = req.headers.get("x-proxy-auth");

  if (!target) {
    return new Response(JSON.stringify({ error: "Missing target URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  if (!isLocal && url.protocol !== "https:") {
    return new Response(JSON.stringify({ error: "Only HTTPS or localhost targets are allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers: Record<string, string> = {};
  if (authHeader) headers["Authorization"] = authHeader;

  try {
    const res = await fetch(target, { headers, signal: req.signal });
    const contentType = res.headers.get("content-type") || "application/json";
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
