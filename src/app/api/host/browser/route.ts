import { NextRequest, NextResponse } from "next/server";
import { guardHostRequest } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// =================================================================
// Real browser tool for Veltrix OS.
// A persistent headless Chromium (via Playwright) that the agent can
// drive autonomously: navigate, click, type, scroll, screenshot, run
// JS, read text, manage tabs. No external API key required.
//
// Safety: access is enforced by the shared host guard
// (src/lib/host-guard.ts). Browser is headless by default; set
// VELTRIX_BROWSER_HEADFUL=true to see it. A single browser/context is
// reused across requests so sessions stay warm and tabs persist between
// tool calls.
// =================================================================

type AnyJson = Record<string, any>;

// ---- Persistent browser state --------------------------------------------

interface BrowserState {
  pw: typeof import("playwright") | null;
  browser: any | null;
  context: any | null;
  /** In-flight context launch, so concurrent requests share one launch. */
  contextPromise: Promise<any> | null;
}

const globalKey = "__veltrix_browser__";
const g: any = globalThis as any;
if (!g[globalKey]) g[globalKey] = { pw: null, browser: null, context: null, contextPromise: null } as BrowserState;
const state: BrowserState = g[globalKey];

async function loadPw(): Promise<typeof import("playwright") | null> {
  if (state.pw) return state.pw;
  try {
    state.pw = await import("playwright");
    return state.pw;
  } catch {
    return null;
  }
}

async function getContext(): Promise<any> {
  const pw = await loadPw();
  if (!pw) throw new Error("Playwright is not installed on the host.");
  if (state.context) return state.context;
  // Two concurrent requests must not both call launchPersistentContext on the
  // same userDataDir (the second fails on the profile lock). Cache a single
  // in-flight launch promise, assigned synchronously before the first await,
  // and have every caller await it.
  if (!state.contextPromise) {
    const headful = process.env.VELTRIX_BROWSER_HEADFUL === "true";
    state.contextPromise = (async () => {
      const path = await import("path");
      const userDataDir = path.join(process.cwd(), ".playwright-data");
      const context = await pw.chromium.launchPersistentContext(userDataDir, {
        headless: !headful,
        args: [
          "--no-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--enable-automation",
        ],
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
        locale: "en-US",
      });
      context.on("close", () => {
        state.context = null;
        state.browser = null;
        state.contextPromise = null;
      });
      state.context = context;
      state.browser = context;
      return context;
    })();
    // If the launch fails, clear the cached promise so a later request retries.
    state.contextPromise.catch(() => { state.contextPromise = null; });
  }
  return state.contextPromise;
}

async function getPage(tabId?: number): Promise<{ page: any; tabId: number; context: any }> {
  const context = await getContext();
  const pages: any[] = context.pages();
  let page: any;
  let id = tabId;
  if (typeof id === "number" && pages[id] && !pages[id].isClosed?.()) {
    page = pages[id];
  } else if (pages.length > 0) {
    page = pages[pages.length - 1];
    id = pages.length - 1;
  } else {
    page = await context.newPage();
    id = 0;
  }
  await page.bringToFront?.().catch(() => {});
  return { page, tabId: id, context };
}

function ok(payload: AnyJson) {
  return NextResponse.json(payload);
}
function fail(status: number, message: string, extra: AnyJson = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function trim(s: string, max: number): string {
  if (typeof s !== "string") return s;
  return s.length > max ? s.slice(0, max) + "\n...[truncated " + (s.length - max) + " chars]" : s;
}

async function detectCaptcha(page: any) {
  try {
    const info = await page.evaluate(() => {
      const title = document.title || "";
      const text = document.body?.innerText?.toLowerCase() || "";

      // Check Cloudflare Turnstile / Challenge
      const hasCfIframe = !!document.querySelector('iframe[src*="challenges.cloudflare.com"]');
      const hasCfWrapper = !!document.querySelector('.cf-turnstile-wrapper') || 
                           !!document.querySelector('#cf-challenge') || 
                           !!document.querySelector('#challenge-form') ||
                           !!document.querySelector('#cf-wrapper');
      const isCfTitle = title.includes("Just a moment...") || 
                        text.includes("checking your browser") || 
                        text.includes("checking your browser before accessing");
      if (hasCfIframe || hasCfWrapper || isCfTitle) {
        return { detected: true, type: "cloudflare", details: "Cloudflare Turnstile Challenge detected" };
      }

      // Check Google reCAPTCHA
      const hasRecaptchaIframe = !!document.querySelector('iframe[src*="recaptcha"]');
      const hasRecaptchaClass = !!document.querySelector('.g-recaptcha') || !!document.getElementById('recaptcha');
      if (hasRecaptchaIframe || hasRecaptchaClass) {
        return { detected: true, type: "recaptcha", details: "Google reCAPTCHA detected" };
      }

      // Check hCaptcha
      const hasHcaptchaIframe = !!document.querySelector('iframe[src*="hcaptcha"]');
      const hasHcaptchaClass = !!document.querySelector('.h-captcha');
      if (hasHcaptchaIframe || hasHcaptchaClass) {
        return { detected: true, type: "hcaptcha", details: "hCaptcha detected" };
      }

      // General Text checks
      const keywords = [
        "verify you are human",
        "verify that you are human",
        "confirm you are not a robot",
        "confirm that you are not a robot",
        "security check",
        "captcha challenge",
        "robot check"
      ];
      for (const kw of keywords) {
        if (text.includes(kw)) {
          return { detected: true, type: "generic", details: `Security verification page detected (${kw})` };
        }
      }

      return { detected: false };
    });
    return info;
  } catch (e) {
    return { detected: false, error: String(e) };
  }
}

const MAX_TEXT = 16000;
const MAX_HTML = 20000;

export async function POST(req: NextRequest) {
  const denied = guardHostRequest(req);
  if (denied) return denied;

  let body: AnyJson;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid JSON body");
  }
  const action = String(body.action || "");

  try {
    switch (action) {
      case "status": {
        const pw = await loadPw();
        return ok({
          available: !!pw,
          browserOpen: !!state.context,
          tabs: state.context ? state.context.pages().length : 0,
        });
      }

      case "navigate": {
        const url = String(body.url || "").trim();
        if (!url) return fail(400, "Missing url");
        const { page, tabId } = await getPage(body.tabId);
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e: any) => ({ error: e.message }));
        const title = await page.title().catch(() => "");
        const finalUrl = page.url();
        return ok({ tabId, url: finalUrl, title: trim(title, 200), status: (resp as any)?.status, error: (resp as any)?.error });
      }

      case "new_tab": {
        const context = await getContext();
        const page = await context.newPage();
        if (body.url) await page.goto(String(body.url), { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
        const pages: any[] = context.pages();
        return ok({ tabId: pages.length - 1, url: page.url(), title: trim(await page.title().catch(() => ""), 200) });
      }

      case "tabs": {
        const context = await getContext();
        const pages: any[] = context.pages();
        const list = await Promise.all(
          pages.map(async (p, i) => ({
            tabId: i,
            url: p.url(),
            title: trim(await p.title().catch(() => ""), 120),
            closed: !!p.isClosed?.(),
          }))
        );
        return ok({ tabs: list });
      }

      case "close_tab": {
        const { page } = await getPage(body.tabId);
        await page.close().catch(() => {});
        return ok({ closed: true });
      }

      case "screenshot": {
        const { page, tabId } = await getPage(body.tabId);
        const full = body.full === true;
        const buf: Buffer = await page.screenshot({ fullPage: full, type: "png" });
        const dataUrl = "data:image/png;base64," + buf.toString("base64");
        const captcha = await detectCaptcha(page);
        return ok({ 
          tabId, 
          url: page.url(), 
          title: trim(await page.title().catch(() => ""), 200), 
          screenshot: dataUrl, 
          bytes: buf.length,
          captcha 
        });
      }

      case "text": {
        const { page } = await getPage(body.tabId);
        const text = await page.innerText("body").catch(() => "");
        return ok({ url: page.url(), text: trim(text, MAX_TEXT) });
      }

      case "html": {
        const { page } = await getPage(body.tabId);
        const html = await page.content().catch(() => "");
        return ok({ url: page.url(), html: trim(html, MAX_HTML) });
      }

      case "title": {
        const { page } = await getPage(body.tabId);
        return ok({ url: page.url(), title: trim(await page.title().catch(() => ""), 200) });
      }

      case "click": {
        const { page } = await getPage(body.tabId);
        const selector = String(body.selector || "");
        if (!selector) {
          if (typeof body.x === "number" && typeof body.y === "number") {
            await page.mouse.click(body.x, body.y);
            await page.waitForLoadState?.("networkidle", { timeout: 4000 }).catch(() => {});
            return ok({ clicked: true, x: body.x, y: body.y, url: page.url() });
          }
          return fail(400, "Missing selector or x/y coordinates");
        }
        await page.click(selector, { timeout: 15000 }).catch((e: any) => {
          throw new Error("click failed: " + e.message);
        });
        await page.waitForLoadState?.("networkidle", { timeout: 8000 }).catch(() => {});
        return ok({ clicked: true, url: page.url() });
      }

      case "fill": {
        const { page } = await getPage(body.tabId);
        const selector = String(body.selector || "");
        const value = String(body.value ?? "");
        if (!selector) return fail(400, "Missing selector");
        await page.fill(selector, value, { timeout: 15000 });
        return ok({ filled: true, selector, value });
      }

      case "type": {
        const { page } = await getPage(body.tabId);
        const text = String(body.text ?? "");
        if (!text) return fail(400, "Missing text");
        await page.keyboard.type(text, { delay: body.delay ? Number(body.delay) : undefined });
        return ok({ typed: true });
      }

      case "press": {
        const { page } = await getPage(body.tabId);
        const key = String(body.key || "");
        if (!key) return fail(400, "Missing key");
        await page.keyboard.press(key);
        return ok({ pressed: key });
      }

      case "select": {
        const { page } = await getPage(body.tabId);
        const selector = String(body.selector || "");
        if (!selector) return fail(400, "Missing selector");
        const values = Array.isArray(body.values) ? body.values.map(String) : [String(body.values ?? "")];
        const selected = await page.selectOption(selector, values).catch((e: any) => { throw new Error("select failed: " + e.message); });
        return ok({ selected });
      }

      case "hover": {
        const { page } = await getPage(body.tabId);
        const selector = String(body.selector || "");
        if (!selector) return fail(400, "Missing selector");
        await page.hover(selector, { timeout: 15000 }).catch((e: any) => { throw new Error("hover failed: " + e.message); });
        return ok({ hovered: true });
      }

      case "scroll": {
        const { page } = await getPage(body.tabId);
        const dy = Number(body.dy ?? 600);
        const dx = Number(body.dx ?? 0);
        await page.mouse.wheel(dx, dy);
        return ok({ scrolled: { dx, dy } });
      }

      case "evaluate": {
        const { page } = await getPage(body.tabId);
        const fn = String(body.fn || "").trim();
        if (!fn) return fail(400, "Missing fn");
        // Accept both bare expressions ("document.title") and function bodies
        // ("() => document.title"). Wrap function forms so they get invoked.
        const isFn = /^(\(.*?\)\s*=>|function\s*\()/.test(fn);
        const expr = isFn ? "(" + fn + ")()" : fn;
        const result = await page.evaluate(expr).catch((e: any) => { throw new Error("evaluate failed: " + e.message); });
        return ok({ result });
      }

      case "wait": {
        const { page } = await getPage(body.tabId);
        const ms = Math.min(Math.max(Number(body.ms ?? 1000), 100), 20000);
        await page.waitForTimeout(ms);
        return ok({ waited: ms });
      }

      case "wait_for": {
        const { page } = await getPage(body.tabId);
        const selector = String(body.selector || "");
        if (!selector) return fail(400, "Missing selector");
        await page.waitForSelector(selector, { timeout: 20000 }).catch((e: any) => { throw new Error("wait_for failed: " + e.message); });
        return ok({ found: selector });
      }

      case "back": {
        const { page } = await getPage(body.tabId);
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        return ok({ url: page.url() });
      }

      case "forward": {
        const { page } = await getPage(body.tabId);
        await page.goForward({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        return ok({ url: page.url() });
      }

      case "links": {
        const { page } = await getPage(body.tabId);
        const links: { text: string; href: string }[] = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("a[href]")).map((a: any) => ({
            text: (a.innerText || a.textContent || "").trim().slice(0, 120),
            href: a.href,
          })).filter((l) => l.href);
        }).catch(() => []);
        return ok({ count: links.length, links: links.slice(0, Number(body.limit ?? 60)) });
      }

      case "close": {
        if (state.context) {
          await state.context.close().catch(() => {});
          state.context = null;
          state.browser = null;
        }
        return ok({ closed: true });
      }

      case "import_profile": {
        const browserType = String(body.browser || "chrome").toLowerCase(); // chrome or edge
        const os = await import("os");
        const path = await import("path");
        const fs = await import("fs/promises");
        
        let profilePath = "";
        if (process.platform === "win32") {
          const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
          if (browserType === "chrome") {
            profilePath = path.join(localAppData, "Google", "Chrome", "User Data", "Default");
          } else {
            profilePath = path.join(localAppData, "Microsoft", "Edge", "User Data", "Default");
          }
        } else if (process.platform === "darwin") {
          if (browserType === "chrome") {
            profilePath = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome", "Default");
          } else {
            profilePath = path.join(os.homedir(), "Library", "Application Support", "Microsoft Edge", "Default");
          }
        } else {
          // Linux
          if (browserType === "chrome") {
            profilePath = path.join(os.homedir(), ".config", "google-chrome", "Default");
          } else {
            profilePath = path.join(os.homedir(), ".config", "microsoft-edge", "Default");
          }
        }

        const userDataDir = path.join(process.cwd(), ".playwright-data");
        const destDefault = path.join(userDataDir, "Default");

        if (state.context) {
          await state.context.close().catch(() => {});
          state.context = null;
          state.browser = null;
        }

        try {
          await fs.access(profilePath);
        } catch {
          return fail(404, `Local ${browserType} profile not found at ${profilePath}`);
        }

        async function copyDir(src: string, dest: string) {
          await fs.mkdir(dest, { recursive: true });
          const entries = await fs.readdir(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              if (["Cache", "Code Cache", "GPUCache", "Service Worker", "CacheStorage", "IndexedDB"].includes(entry.name)) continue;
              await copyDir(srcPath, destPath).catch(() => {});
            } else {
              await fs.copyFile(srcPath, destPath).catch(() => {});
            }
          }
        }

        await copyDir(profilePath, destDefault);
        return ok({ imported: true, from: profilePath, to: destDefault });
      }

      case "solve_captcha": {
        const { page } = await getPage(body.tabId);
        
        // 1. Try Cloudflare Turnstile
        const cfIframe = page.locator('iframe[src*="challenges.cloudflare.com"]').first();
        if (await cfIframe.count() > 0 && await cfIframe.isVisible()) {
          const box = await cfIframe.boundingBox();
          if (box) {
            const clickX = box.x + box.width / 2;
            const clickY = box.y + box.height / 2;
            await page.mouse.click(clickX, clickY);
            await page.waitForTimeout(3000);
            return ok({ solved: true, type: "cloudflare", details: "Clicked Cloudflare Turnstile iframe center" });
          }
        }

        // 2. Try Google reCAPTCHA
        const recaptchaIframe = page.locator('iframe[src*="recaptcha/api2/anchor"], iframe[title*="reCAPTCHA"]').first();
        if (await recaptchaIframe.count() > 0 && await recaptchaIframe.isVisible()) {
          const box = await recaptchaIframe.boundingBox();
          if (box) {
            const clickX = box.x + 30; // Checkbox anchor is located at x offset ~30px
            const clickY = box.y + box.height / 2;
            await page.mouse.click(clickX, clickY);
            await page.waitForTimeout(3000);
            return ok({ solved: true, type: "recaptcha", details: "Clicked Google reCAPTCHA checkbox anchor" });
          }
        }

        // 3. Try hCaptcha
        const hcaptchaIframe = page.locator('iframe[src*="hcaptcha.com/box"], iframe[title*="hCaptcha"]').first();
        if (await hcaptchaIframe.count() > 0 && await hcaptchaIframe.isVisible()) {
          const box = await hcaptchaIframe.boundingBox();
          if (box) {
            const clickX = box.x + 30;
            const clickY = box.y + box.height / 2;
            await page.mouse.click(clickX, clickY);
            await page.waitForTimeout(3000);
            return ok({ solved: true, type: "hcaptcha", details: "Clicked hCaptcha checkbox anchor" });
          }
        }

        // 4. Fallback checkbox click
        const clickedFallback = await page.evaluate(() => {
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
          for (const cb of checkboxes) {
            const rect = cb.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const el = cb as HTMLElement;
              el.click();
              return true;
            }
          }
          return false;
        }).catch(() => false);

        if (clickedFallback) {
          await page.waitForTimeout(3000);
          return ok({ solved: true, type: "fallback", details: "Clicked fallback page checkbox" });
        }

        return fail(404, "No standard Captcha iframes or checkboxes found on the page.");
      }

      default:
        return fail(400, "Unknown action: " + action);
    }
  } catch (err: any) {
    return fail(500, err?.message || String(err), { action });
  }
}
