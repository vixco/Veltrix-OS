# Veltrix OS

A premium self-hosted AI operating system with artifact-based output, multi-provider support, and Apple-level UI polish.

## Features

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

MIT