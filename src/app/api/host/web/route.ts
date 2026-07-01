import { NextRequest, NextResponse } from "next/server";
import { guardHostRequest, assertPublicUrl } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Host-side web access with NO external API keys. Two actions:
//   { action: "search", query, count? }  -> DuckDuckGo HTML scrape, no key
//   { action: "fetch",  url, raw?, maxChars? } -> fetch any URL, return readable text
// All requests run on the Next.js server (host) so browser CORS is not an issue.
//
// Security: gated by the shared host guard (src/lib/host-guard.ts) like every
// other host route, and the "fetch" action performs genuine SSRF protection —
// it resolves DNS and rejects loopback/private/link-local/unique-local targets,
// re-validating every redirect hop.

// Fetch a URL with manual redirect handling so each hop is re-validated against
// the SSRF blocklist (a public URL must not be able to redirect to an internal
// address). Returns the final Response.
async function ssrfSafeFetch(
  target: string,
  init: RequestInit,
  maxRedirects = 5
): Promise<Response> {
  let current = target;
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    const status = res.status;
    if (status >= 300 && status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function duckduckgoSearch(query: string, count: number): Promise<SearchResult[]> {
  const url = "https://duckduckgo.com/html/?q=" + encodeURIComponent(query) + "&kl=us-en";
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error("DuckDuckGo returned " + res.status);
  const html = await res.text();
  const results: SearchResult[] = [];

  // result blocks: <a class="result__a" href="...uddg=ENCODED...">Title</a>
  // followed by <a class="result__snippet" ...>snippet</a>
  const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const links: { url: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, "").trim());
    // extract real url from uddg= param, fall back to raw href
    let real = href;
    try {
      const u = new URL(href, "https://duckduckgo.com");
      const uddg = u.searchParams.get("uddg");
      if (uddg) real = decodeURIComponent(uddg);
      else if (href.startsWith("//")) real = "https:" + href;
      else if (href.startsWith("/")) real = "https://duckduckgo.com" + href;
    } catch {}
    if (title && real) links.push({ url: real, title });
  }

  const snippetRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  const snippets: string[] = [];
  while ((m = snippetRe.exec(html))) {
    snippets.push(decodeEntities(m[1].replace(/<[^>]+>/g, "").trim()));
  }

  for (let i = 0; i < links.length && results.length < count; i++) {
    results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] || "" });
  }
  return results;
}

// Very small readability extractor: pull <title>, <main>/<article>/<body> text,
// drop scripts/styles/nav/footer, collapse whitespace. Good enough to feed an
// LLM without shipping a full library.
function extractReadable(html: string): { title: string; text: string } {
  let title = "";
  const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (tm) title = decodeEntities(tm[1].replace(/<[^>]+>/g, "").trim());

  // pick the densest container if present
  let body = html;
  for (const sel of [/<main[\s\S]*?<\/main>/i, /<article[\s\S]*?<\/article>/i]) {
    const mm = body.match(sel);
    if (mm && mm[0].length > 400) { body = mm[0]; break; }
  }

  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|footer|header|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  let text = decodeEntities(body).replace(/\s+/g, " ").trim();
  return { title, text };
}

export async function POST(req: NextRequest) {
  const denied = guardHostRequest(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "search") {
      const query = String(body.query || "").trim();
      const count = Math.min(Math.max(Number(body.count) || 6, 1), 15);
      if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
      const results = await duckduckgoSearch(query, count);
      return NextResponse.json({ query, results });
    }

    if (action === "fetch") {
      const target = String(body.url || "").trim();
      if (!target) return NextResponse.json({ error: "Missing url" }, { status: 400 });
      // Genuine SSRF protection: resolve DNS and reject internal ranges, and
      // re-validate every redirect hop (done inside ssrfSafeFetch).
      let res: Response;
      try {
        res = await ssrfSafeFetch(target, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: req.signal,
        });
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Blocked or invalid url" }, { status: 403 });
      }
      const maxChars = Math.min(Math.max(Number(body.maxChars) || 16000, 200), 80000);
      const raw = !!body.raw;
      const ct = res.headers.get("content-type") || "";
      const rawText = await res.text();
      if (raw || !/html/i.test(ct)) {
        return NextResponse.json({
          url: target, status: res.status, contentType: ct,
          text: rawText.slice(0, maxChars), truncated: rawText.length > maxChars,
        });
      }
      const { title, text } = extractReadable(rawText);
      return NextResponse.json({
        url: target, status: res.status, contentType: ct, title,
        text: text.slice(0, maxChars), truncated: text.length > maxChars,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
