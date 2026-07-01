# Veltrix OS

A premium self-hosted AI operating system with artifact-based output, multi-provider support, and Apple-level UI polish.

## Veltrix as a real OS (AGI mode)

Veltrix OS is not just a chat shell. It is a self-aware agent with a real browser, a real desktop, and direct access to the host machine.

- **Real browser** — Veltrix drives a live headless Chromium (Playwright) on its own: navigate, click, fill forms, type, scroll, take screenshots, run JavaScript on the page, read rendered text/HTML, and manage multiple tabs. It uses the browser autonomously inside its agent loop when a page needs interaction or JavaScript to render. No API key required; run `npx playwright install chromium` once on the host.
- **Files desktop** — a real file manager for this machine at `/files`. Browse directories, open and edit text files inline, create files and folders, rename, delete, and download. Breadcrumb navigation, host home directory, and a full keyboard-friendly editor (Ctrl/Cmd-S to save).
- **Host shell + filesystem** — Veltrix can run shell commands and read/write files on the host directly, so it can genuinely do work (git, scripts, build, inspect) instead of just describing it.
- **Self-model** — every turn, Veltrix is told exactly who it is, which model it is running on, what host it is on, and which capabilities are enabled right now, so it acts with awareness of its own situation.
- **Autonomous agent loop** — Veltrix emits `tool_call` blocks, the system runs the tool, feeds the result back, and Veltrix keeps going across multiple steps until the task is genuinely done.

Enable these under **Settings → Capabilities**: *Web access*, *Real browser*, and *Host access*. They are on by default in local development. In production, the host routes are **disabled by default** — read the **[Security](#security)** section below before enabling them. Do not expose Veltrix OS on a public network without the protections described there.

## Security

The `/api/host/*` routes (`exec`, `fs`, `browser`, `web`) give the app **arbitrary shell execution, full filesystem access, live browser control, and server-side HTTP** on the host. Treat them as a remote-code-execution surface and gate them accordingly.

**Risk.** If these routes are reachable by an untrusted party while enabled, that party gets a shell and your files. Every host route is protected by a shared guard (`src/lib/host-guard.ts`) that enforces, in order:

1. **Env gate** — in production the routes are off unless you set `VELTRIX_HOST_ACCESS=true`. Local dev (`NODE_ENV !== "production"`) is open for convenience.
2. **Strict same-origin** — a request that carries **no `Origin` and no `Referer`** header is **rejected**. Browsers always send one of these on a same-origin POST, so this blocks `curl`/server-side callers. A present `Origin` must match the request host.
3. **Shared-secret token (recommended for any exposed deployment)** — set `VELTRIX_HOST_TOKEN` on the server to a long random value **and** expose the same value to the browser build as `NEXT_PUBLIC_VELTRIX_HOST_TOKEN`. When set, every host route additionally requires the `x-veltrix-host-token` header (constant-time compared). The app sends it automatically.

**This is not a substitute for real authentication.** The token only stops non-browser callers; anyone who loads the app in a browser can use the host tools. **Do not expose Veltrix OS publicly without a real auth layer in front of it** (reverse-proxy Basic Auth, an SSO proxy such as oauth2-proxy, a VPN, or firewall rules). Recommended production posture:

- Keep `VELTRIX_HOST_ACCESS` unset (host tools off) unless you specifically need them.
- If you need them, run behind a reverse proxy that requires authentication, and set `VELTRIX_HOST_TOKEN` as defense-in-depth.

**Environment variables**

| Variable | Purpose |
| --- | --- |
| `VELTRIX_HOST_ACCESS` | `true` to enable host routes in production (off by default). |
| `VELTRIX_HOST_TOKEN` | Server-side shared secret required on every host route when set. |
| `NEXT_PUBLIC_VELTRIX_HOST_TOKEN` | Same value, exposed to the browser so the app can send the token header. |
| `VELTRIX_FS_ROOT` | Optional jail: confine all `/api/host/fs` paths to this directory. Paths that resolve outside it are rejected. |
| `VELTRIX_BROWSER_HEADFUL` | `true` to run the Playwright browser headful. |

**SSRF.** The `web` route's `fetch` action resolves DNS and refuses loopback/private/link-local/unique-local targets (127.0.0.0/8, ::1, 10/8, 172.16/12, 192.168/16, 169.254/16, fe80::/10, fc00::/7, etc.), re-validating every redirect hop.

**Filesystem.** Regardless of `VELTRIX_FS_ROOT`, the `fs` route always refuses a recursive delete of a filesystem/drive root. Set `VELTRIX_FS_ROOT` to confine the file manager and agent to a single directory.

### Sharing security

Public artifact sharing stores records in a PocketBase `shared_artifacts` collection. The reader page (`/shared/[token]`) uses a **parameterized** filter and only resolves **public** shares for anonymous visitors (a signed-in owner may also open their own private shares). Share tokens are generated with `crypto.getRandomValues` (192-bit, unguessable).

Client-side filters are **not** a security boundary. You **must** also restrict the collection's API rules server-side in PocketBase. Recommended List/View rule:

```
isPublic = true || (@request.auth.id != "" && owner = @request.auth.id)
```

## Features

- **No backend required** — runs fully standalone in the browser as a local guest, with optional cloud sync via PocketBase
- **Claude-like chat** — streaming responses, message editing, regeneration, history
- **Artifact System** — structured outputs instead of raw markdown:
  - 📄 **Document** — structured sections, headings, bullet lists
  - 📊 **Comparison** — cards with pros/cons and scoring
  - 💻 **Code** — HTML/React preview with live render
  - 📅 **Planner** — timeline with scheduled items
- **Multi-Provider** — OpenAI, Anthropic, OpenRouter, Ollama, LM Studio, custom OpenAI-compatible
- **Premium UI** — dark-first, minimal chrome, Linear-inspired spacing, Apple-level polish

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS (custom design tokens)
- Zustand (persisted state)
- Radix UI primitives
- React Markdown + syntax highlighting

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Provider Setup

1. Click **Provider Settings** in the sidebar
2. Enable your provider(s)
3. Enter API key / base URL as needed
4. Select model from the header dropdown

All keys are stored locally in your browser (localStorage). Never sent to any server except the provider's API.

## Local vs Cloud mode

Veltrix OS works out of the box with **no server setup**. On first visit you enter as a local guest and everything (chats, artifacts, projects, provider keys) is stored in your browser's `localStorage`.

- **Local (default)** — guest identity, all data stays on your device. Nothing leaves your machine except calls to the AI provider you configure.
- **Cloud (optional)** — sign in with an account to sync projects and share artifacts across devices. Requires a PocketBase instance (`NEXT_PUBLIC_POCKETBASE_URL`). Sign out at any time to drop back to local mode.

The "Continue without an account" button on the login screen skips auth entirely.

## Architecture

```
src/
├── app/
│   ├── globals.css      # Design tokens + base styles
│   ├── layout.tsx        # Root layout, fonts
│   └── page.tsx          # Main chat workspace
├── components/
│   ├── ui/               # Base UI primitives (button, input, dialog, etc.)
│   ├── sidebar.tsx       # Conversation history
│   ├── model-selector.tsx
│   ├── chat-message.tsx  # Message rendering + markdown
│   ├── chat-input.tsx    # Input with streaming controls
│   ├── artifact-bubble.tsx
│   ├── artifact-panel.tsx
│   ├── settings-panel.tsx
│   └── artifacts/        # 4 artifact type renderers
│       ├── artifact-document.tsx
│       ├── artifact-comparison.tsx
│       ├── artifact-code.tsx
│       └── artifact-planner.tsx
└── lib/
    ├── providers.ts      # Provider abstraction layer
    ├── artifacts.ts      # Artifact types + parser
    ├── store.ts          # Zustand stores (chat, provider, artifact)
    └── utils.ts          # Helpers
```

## License

Veltrix OS is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [LICENSE](./LICENSE) file for the full terms, or <https://www.gnu.org/licenses/>.

Network use (e.g. offering Veltrix OS as a hosted service) counts as distribution under the AGPLv3, so you must make the corresponding source code available to users of the service.