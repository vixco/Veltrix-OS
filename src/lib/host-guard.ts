import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

// =================================================================
// Shared security guard for every /api/host/* route.
//
// A single place that decides whether a host-capability request (shell
// exec, filesystem, browser control, web fetch) is allowed to run. It is
// deliberately fail-closed:
//   1. hostAccessEnabled()  — env gate (dev is open; production must opt in)
//   2. strict same-origin   — a request with NO Origin AND NO Referer is
//      REJECTED (the previous behavior of "no origin => trust" let any
//      curl/server-side caller through, which was an unauthenticated RCE).
//   3. shared-secret token  — when VELTRIX_HOST_TOKEN is set, every host
//      route additionally requires the x-veltrix-host-token header to match
//      (constant-time compare). The browser app supplies this from
//      NEXT_PUBLIC_VELTRIX_HOST_TOKEN.
//
// See README "Security" for the deployment guidance this enforces.
// =================================================================

export const HOST_TOKEN_HEADER = "x-veltrix-host-token";

/** Env gate: open in local dev, opt-in with VELTRIX_HOST_ACCESS=true in prod. */
export function hostAccessEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.VELTRIX_HOST_ACCESS === "true";
}

/**
 * Strict same-origin check. Unlike the old helper, a request that carries
 * NEITHER an Origin NOR a Referer header is REJECTED — browsers always send
 * one of these for a same-origin POST, so a missing pair means a non-browser
 * caller (curl, another server) and must not be trusted.
 */
function strictSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  if (!origin) return false; // fail closed: no browser context => reject
  try {
    const host = req.headers.get("host") || "";
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Constant-time string compare via fixed-length digests (no length leak). */
function timingSafeStrEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Token check. When VELTRIX_HOST_TOKEN is unset, this gate is inactive. */
function tokenValid(req: NextRequest): boolean {
  const expected = process.env.VELTRIX_HOST_TOKEN;
  if (!expected) return true; // token gate not configured
  const provided = req.headers.get(HOST_TOKEN_HEADER) || "";
  return timingSafeStrEqual(provided, expected);
}

/**
 * Guard a host route. Returns a NextResponse to short-circuit (403) when the
 * request must be rejected, or null when it is allowed to proceed.
 */
export function guardHostRequest(req: NextRequest): NextResponse | null {
  if (!hostAccessEnabled()) {
    return NextResponse.json(
      { error: "Host access is disabled on this server. Set VELTRIX_HOST_ACCESS=true to enable." },
      { status: 403 }
    );
  }
  if (!strictSameOrigin(req)) {
    return NextResponse.json(
      { error: "Cross-origin or non-browser host access is not allowed." },
      { status: 403 }
    );
  }
  if (!tokenValid(req)) {
    return NextResponse.json(
      { error: "Invalid or missing host token." },
      { status: 403 }
    );
  }
  return null;
}

// =================================================================
// SSRF protection (used by /api/host/web).
// =================================================================

/**
 * Expand a (net.isIPv6-validated) IPv6 literal into its 8 16-bit groups.
 * Handles `::` zero-compression and an optional embedded dotted-IPv4 tail
 * (e.g. `::ffff:127.0.0.1`). Returns null if it cannot be parsed (fail closed).
 */
function ipv6ToGroups(ip: string): number[] | null {
  // Fold any embedded dotted-IPv4 tail (`...:a.b.c.d`) into two hex groups so
  // that both serializations of a mapped address parse identically.
  let s = ip.toLowerCase().replace(/(\d{1,3}(?:\.\d{1,3}){3})$/, (m) => {
    const parts = m.split(".").map((n) => parseInt(n, 10));
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return m;
    const g6 = ((parts[0] << 8) | parts[1]).toString(16);
    const g7 = ((parts[2] << 8) | parts[3]).toString(16);
    return `${g6}:${g7}`;
  });
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : null;
  let groups: number[];
  if (tail === null) {
    if (head.length !== 8) return null; // no "::" => must be fully specified
    groups = head.map((h) => parseInt(h, 16));
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [
      ...head.map((h) => parseInt(h, 16)),
      ...Array(missing).fill(0),
      ...tail.map((h) => parseInt(h, 16)),
    ];
  }
  if (groups.length !== 8) return null;
  if (groups.some((g) => Number.isNaN(g) || g < 0 || g > 0xffff)) return null;
  return groups;
}

/** True if the given literal IP is loopback / private / link-local / ULA. */
function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map((n) => parseInt(n, 10));
    if (p.some((n) => Number.isNaN(n))) return true;
    if (p[0] === 0) return true;                      // 0.0.0.0/8
    if (p[0] === 127) return true;                    // 127.0.0.0/8 loopback
    if (p[0] === 10) return true;                      // 10.0.0.0/8 private
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16.0.0/12
    if (p[0] === 192 && p[1] === 168) return true;    // 192.168.0.0/16
    if (p[0] === 169 && p[1] === 254) return true;    // 169.254.0.0/16 link-local
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // 100.64.0.0/10 CGNAT
    if (p[0] >= 224) return true;                      // 224.0.0.0/4 multicast + reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === "::1") return true;                  // loopback
    if (norm === "::") return true;                   // unspecified

    const groups = ipv6ToGroups(norm);
    if (!groups) return true;                         // unparseable => fail closed

    const topZero =
      groups[0] === 0 && groups[1] === 0 && groups[2] === 0 &&
      groups[3] === 0 && groups[4] === 0;

    // NAT64 well-known prefix 64:ff9b::/96 — reject outright.
    if (
      groups[0] === 0x64 && groups[1] === 0xff9b &&
      groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0
    ) {
      return true;
    }

    // IPv4-mapped (::ffff:0:0/96, in EITHER the dotted `::ffff:127.0.0.1` or the
    // hex `::ffff:7f00:1` serialization) and the deprecated IPv4-compatible
    // (::/96) form both embed an IPv4 address in the low 32 bits. Extract it and
    // run the embedded v4 through the IPv4 range checks so mapped loopback /
    // private / link-local / metadata literals are blocked exactly like plain v4.
    const isMapped = topZero && groups[5] === 0xffff;
    const isCompat = topZero && groups[5] === 0;
    if (isMapped || isCompat) {
      const a = (groups[6] >> 8) & 0xff, b = groups[6] & 0xff;
      const c = (groups[7] >> 8) & 0xff, d = groups[7] & 0xff;
      return isBlockedIp(`${a}.${b}.${c}.${d}`);
    }

    const first = groups[0];
    if (first >= 0xfe80 && first <= 0xfebf) return true; // fe80::/10 link-local
    if (first >= 0xfc00 && first <= 0xfdff) return true; // fc00::/7 unique-local
    return false;
  }
  // Unknown format: treat as blocked (fail closed).
  return true;
}

/**
 * Reject a URL that targets a non-public address. Resolves DNS for hostnames
 * (checking every returned address) and validates literal IP hosts directly.
 * Throws on any blocked target; returns normally when the URL is safe to fetch.
 */
export async function assertPublicUrl(target: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new Error("Invalid url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https urls are allowed");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new Error("Blocked internal host: localhost");
  }
  // Literal IP host — check directly, no DNS.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("Blocked private/loopback address");
    return url;
  }
  // Hostname — resolve ALL addresses and reject if any is internal.
  // TODO(security): pin the resolved IP to the connection to fully close the
  // DNS-rebinding TOCTOU — fetch() re-resolves DNS, so a name that passes here
  // could still resolve to an internal address at connect time. Validating every
  // returned address (below) mitigates but does not eliminate the race.
  let results: { address: string }[];
  try {
    results = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error("Could not resolve host");
  }
  if (!results.length) throw new Error("Could not resolve host");
  for (const r of results) {
    if (isBlockedIp(r.address)) throw new Error("Blocked private/loopback address");
  }
  return url;
}
