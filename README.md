# Veltrix OS

A premium self-hosted AI operating system with artifact-based output, multi-provider support, and Apple-level UI polish.

## Veltrix as a real OS (AGI mode)

Veltrix OS is not just a chat shell. It is a self-aware agent with a real browser, a real desktop, and direct access to the host machine.

- **Real browser** — Veltrix drives a live headless Chromium (Playwright) on its own: navigate, click, fill forms, type, scroll, take screenshots, run JavaScript on the page, read rendered text/HTML, and manage multiple tabs. It uses the browser autonomously inside its agent loop when a page needs interaction or JavaScript to render. No API key required; run `npx playwright install chromium` once on the host.
- **Files desktop** — a real file manager for this machine at `/files`. Browse directories, open and edit text files inline, create files and folders, rename, delete, and download. Breadcrumb navigation, host home directory, and a full keyboard-friendly editor (Ctrl/Cmd-S to save).
- **Host shell + filesystem** — Veltrix can run shell commands and read/write files on the host directly, so it can genuinely do work (git, scripts, build, inspect) instead of just describing it.
- **Self-model** — every turn, Veltrix is told exactly who it is, which model it is running on, what host it is on, and which capabilities are enabled right now, so it acts with awareness of its own situation.
- **Autonomous agent loop** — Veltrix emits `tool_call` blocks, the system runs the tool, feeds the result back, and Veltrix keeps going across multiple steps until the task is genuinely done.

Enable these under **Settings → Capabilities**: *Web access*, *Real browser*, and *Host access*. They are on by default in local development. In production, set `VELTRIX_HOST_ACCESS=true` on the server to opt in to host shell, filesystem, and browser control.

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

- Next.js 15 (App Router) + TypeScript
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
│   ├── settings-dialog.tsx
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