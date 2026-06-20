// ═══════════════════════════════════════════════
// Provider Type System
// ═══════════════════════════════════════════════

export type ProviderId =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "ollama"
  | "lmstudio"
  | "openai-compatible";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  /** Base URL for API calls. If empty, uses provider default. */
  baseUrl?: string;
  /** API key (stored in localStorage, never sent to server except for proxy) */
  apiKey?: string;
  /** Whether this provider is enabled/active */
  enabled: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  contextWindow?: number;
  description?: string;
  /** Whether this model supports streaming */
  streaming?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface CompletionParams {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  models: ModelInfo[];
  /** Build the SSE stream from this provider */
  streamCompletion(
    config: ProviderConfig,
    params: CompletionParams
  ): Promise<ReadableStream<StreamChunk>>;
}

// ═══════════════════════════════════════════════
// Provider Adapters
// ═══════════════════════════════════════════════

const OpenAIAdapter: ProviderAdapter = {
  id: "openai",
  label: "OpenAI",
  defaultBaseUrl: "https://api.openai.com/v1",
  requiresApiKey: true,
  models: [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", contextWindow: 128000 },
    { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "openai", contextWindow: 128000 },
    { id: "o3-mini", name: "o3-mini", provider: "openai", contextWindow: 200000 },
  ],
  async streamCompletion(config, params) {
    const base = config.baseUrl || OpenAIAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stream: true,
      }),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    return parseSSEStream(res, (data) => data.choices?.[0]?.delta?.content || "");
  },
};

const AnthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  defaultBaseUrl: "https://api.anthropic.com",
  requiresApiKey: true,
  models: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", contextWindow: 200000 },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", contextWindow: 200000 },
  ],
  async streamCompletion(config, params) {
    const base = config.baseUrl || AnthropicAdapter.defaultBaseUrl;
    const systemMsg = params.messages.find((m) => m.role === "system");
    const chatMsgs = params.messages.filter((m) => m.role !== "system");
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey || "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: params.model,
        messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
        system: systemMsg?.content,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        stream: true,
      }),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
    return parseAnthropicSSE(res);
  },
};

const OpenRouterAdapter: ProviderAdapter = {
  id: "openrouter",
  label: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  requiresApiKey: true,
  models: [
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "openrouter" },
    { id: "openai/gpt-4o", name: "GPT-4o", provider: "openrouter" },
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "openrouter" },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "openrouter" },
  ],
  async streamCompletion(config, params) {
    const base = config.baseUrl || OpenRouterAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "https://veltrix-os.dev",
        "X-Title": "Veltrix OS",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stream: true,
      }),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    return parseSSEStream(res, (data) => data.choices?.[0]?.delta?.content || "");
  },
};

const OllamaAdapter: ProviderAdapter = {
  id: "ollama",
  label: "Ollama",
  defaultBaseUrl: "http://localhost:11434",
  requiresApiKey: false,
  models: [
    { id: "llama3.3", name: "Llama 3.3", provider: "ollama" },
    { id: "qwen2.5", name: "Qwen 2.5", provider: "ollama" },
    { id: "deepseek-r1", name: "DeepSeek R1", provider: "ollama" },
    { id: "mistral", name: "Mistral", provider: "ollama" },
  ],
  async streamCompletion(config, params) {
    const base = config.baseUrl || OllamaAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true,
        options: {
          temperature: params.temperature ?? 0.7,
          num_predict: params.maxTokens,
        },
      }),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    return parseNDJSONStream(res, (data) => data.message?.content || "");
  },
};

const LMStudioAdapter: ProviderAdapter = {
  id: "lmstudio",
  label: "LM Studio",
  defaultBaseUrl: "http://localhost:1234/v1",
  requiresApiKey: false,
  models: [
    { id: "local-model", name: "Loaded Model", provider: "lmstudio" },
  ],
  async streamCompletion(config, params) {
    const base = config.baseUrl || LMStudioAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stream: true,
      }),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`LM Studio error: ${res.status}`);
    return parseSSEStream(res, (data) => data.choices?.[0]?.delta?.content || "");
  },
};

const OpenAICompatibleAdapter: ProviderAdapter = {
  id: "openai-compatible",
  label: "Custom (OpenAI-compatible)",
  defaultBaseUrl: "",
  requiresApiKey: false,
  models: [
    { id: "custom-model", name: "Custom Model", provider: "openai-compatible" },
  ],
  async streamCompletion(config, params) {
    if (!config.baseUrl) throw new Error("Custom provider requires baseUrl");
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stream: true,
      }),
      signal: params.signal,
    });
    if (!res.ok) throw new Error(`Custom provider error: ${res.status}`);
    return parseSSEStream(res, (data) => data.choices?.[0]?.delta?.content || "");
  },
};

// ═══════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════

export const PROVIDERS: Record<ProviderId, ProviderAdapter> = {
  openai: OpenAIAdapter,
  anthropic: AnthropicAdapter,
  openrouter: OpenRouterAdapter,
  ollama: OllamaAdapter,
  lmstudio: LMStudioAdapter,
  "openai-compatible": OpenAICompatibleAdapter,
};

export function getProvider(id: ProviderId): ProviderAdapter {
  return PROVIDERS[id];
}

export function getAllModels(): ModelInfo[] {
  return Object.values(PROVIDERS).flatMap((p) => p.models);
}

// ═══════════════════════════════════════════════
// SSE / Stream parsers
// ═══════════════════════════════════════════════

async function parseSSEStream(
  res: Response,
  extractDelta: (data: any) => string
): Promise<ReadableStream<StreamChunk>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") {
          controller.enqueue({ delta: "", done: true });
          controller.close();
          return;
        }
        try {
          const data = JSON.parse(dataStr);
          const delta = extractDelta(data);
          if (delta) controller.enqueue({ delta, done: false });
        } catch {}
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

async function parseAnthropicSSE(res: Response): Promise<ReadableStream<StreamChunk>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.type === "content_block_delta" && data.delta?.text) {
            controller.enqueue({ delta: data.delta.text, done: false });
          }
          if (data.type === "message_stop") {
            controller.enqueue({ delta: "", done: true });
            controller.close();
            return;
          }
        } catch {}
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

async function parseNDJSONStream(
  res: Response,
  extract: (data: any) => string
): Promise<ReadableStream<StreamChunk>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed);
          if (data.done || data.response === undefined) {
            controller.enqueue({ delta: "", done: true });
            controller.close();
            return;
          }
          const delta = extract(data);
          if (delta) controller.enqueue({ delta, done: false });
        } catch {}
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}