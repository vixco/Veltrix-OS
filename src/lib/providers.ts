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

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  /** Optional reasoning/thinking content streamed separately from the answer. */
  thinking?: string;
  /** Provider stop reason (e.g. "length", "max_tokens", "end_turn", "stop"). Used to detect truncated responses for "Continue generating". */
  finishReason?: string;
}

export interface CompletionParams {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Extended thinking control: "auto" = per-model default, "on" = force, "off" = disable (saves tokens). */
  thinking?: "auto" | "on" | "off";
  thinkingBudget?: number;
}

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  requiresApiKey: boolean;
  /** Static fallback catalog (real model IDs). Empty for local providers
   *  whose models must be discovered at runtime from the running server. */
  models: ModelInfo[];
  /** Build the SSE stream from this provider */
  streamCompletion(
    config: ProviderConfig,
    params: CompletionParams
  ): Promise<ReadableStream<StreamChunk>>;
  /** Discover the real list of models currently available on this provider.
   *  Throws on connection / auth failure so callers can surface a status. */
  fetchModels?(config: ProviderConfig): Promise<ModelInfo[]>;
}

// ═══════════════════════════════════════════════
// Proxy Fetch Helper
// Routes localhost requests through the Next.js API proxy to avoid CORS
// ═══════════════════════════════════════════════

function isLocalhost(url: string): boolean {
  try {
    const u = new URL(url);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(u.hostname);
  } catch {
    return false;
  }
}

async function proxyFetch(
  target: string,
  method: "GET" | "POST",
  payload?: any,
  signal?: AbortSignal,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const isLocal = isLocalhost(target);

  // Route through Next.js API proxy for localhost (CORS) or when auth headers
  // are needed for a remote API that may not support browser CORS
  const useProxy = isLocal || (extraHeaders && extraHeaders["Authorization"]);

  if (!useProxy) {
    return fetch(target, {
      method,
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: payload ? JSON.stringify(payload) : undefined,
      signal,
    });
  }

  const proxyUrl = "/api/proxy";
  if (method === "GET") {
    const params = new URLSearchParams({ target });
    if (extraHeaders?.["Authorization"]) {
      params.set("auth", extraHeaders["Authorization"]);
    }
    return fetch(`${proxyUrl}?${params}`, { signal });
  }
  return fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, method, payload, headers: extraHeaders }),
    signal,
  });
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
  async fetchModels(config) {
    const base = config.baseUrl || OpenAIAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenAI list error: ${res.status}`);
    const json = await res.json();
    return (json.data || [])
      .map((m: any) => ({ id: m.id, name: m.id, provider: "openai" as ProviderId }))
      .filter((m: ModelInfo) => !m.id.includes("embedding") && !m.id.includes("tts") && !m.id.includes("whisper") && !m.id.includes("dall-e") && !m.id.includes("moderation"));
  },
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

// Models that support extended thinking. We only enable it for capable models
// so older ones (e.g. Haiku 3.5) keep working with a plain completion.
function supportsAnthropicThinking(modelId: string): boolean {
  const m = (modelId || "").toLowerCase();
  return (
    m.includes("sonnet-4") ||
    m.includes("opus-4") ||
    m.includes("3-7-sonnet") ||
    m.includes("haiku-4-5") ||
    m.includes("4-5-sonnet") ||
    m.includes("4-1-opus")
  );
}

const AnthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  defaultBaseUrl: "https://api.anthropic.com",
  requiresApiKey: true,
  models: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", contextWindow: 200000 },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", contextWindow: 200000 },
  ],
  async fetchModels(config) {
    const base = config.baseUrl || AnthropicAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/v1/models`, {
      headers: {
        "x-api-key": config.apiKey || "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
    if (!res.ok) throw new Error(`Anthropic list error: ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((m: any) => ({
      id: m.id,
      name: m.display_name || m.id,
      provider: "anthropic" as ProviderId,
      contextWindow: m.context_window,
    }));
  },
  async streamCompletion(config, params) {
    const base = config.baseUrl || AnthropicAdapter.defaultBaseUrl;
    const systemMsg = params.messages.find((m) => m.role === "system");
    const chatMsgs = params.messages.filter((m) => m.role !== "system");
    const thinkingMode = params.thinking ?? "auto";
    const useThinking = thinkingMode === "off" ? false : thinkingMode === "on" ? true : supportsAnthropicThinking(params.model);
    // Extended thinking requires temperature = 1 and max_tokens > budget_tokens.
    const budgetTokens = params.thinkingBudget ?? 4000;
    const maxTokens = useThinking
      ? Math.max(params.maxTokens ?? 8192, budgetTokens + 2048)
      : params.maxTokens ?? 4096;
    const body: Record<string, any> = {
      model: params.model,
      messages: chatMsgs.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
      system: systemMsg?.content,
      max_tokens: maxTokens,
      temperature: useThinking ? 1 : params.temperature ?? 0.7,
      stream: true,
    };
    if (useThinking) {
      body.thinking = { type: "enabled", budget_tokens: budgetTokens };
    }
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey || "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
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
  async fetchModels(config) {
    const base = config.baseUrl || OpenRouterAdapter.defaultBaseUrl;
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenRouter list error: ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
      provider: "openrouter" as ProviderId,
      contextWindow: m.context_length,
    }));
  },
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
    return parseSSEStream(
      res,
      (data) => data.choices?.[0]?.delta?.content || "",
      (data) => data.choices?.[0]?.delta?.reasoning || ""
    );
  },
};

// Ollama Cloud (https://ollama.com/v1) exposes an OpenAI-compatible API,
// while a local Ollama server uses its native /api/tags + /api/chat routes.
// We branch on the base URL so the same provider entry works for both.
function isOllamaCloud(base: string): boolean {
  try {
    const u = new URL(base);
    return u.hostname === "ollama.com" || u.pathname.replace(/\/$/, "").endsWith("/v1");
  } catch {
    return false;
  }
}
async function safeText(res: Response): Promise<string> {
  try { return (await res.text()).trim().slice(0, 200); } catch { return ""; }
}

function extractJsonReply(text: string): string {
  // Single OpenAI-style completion object.
  try {
    const json = JSON.parse(text);
    return json.choices?.[0]?.message?.content ?? json.error?.message ?? "";
  } catch {}
  // NDJSON: one JSON object per line (Ollama native streaming shape).
  let out = "";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || !t.startsWith("{")) continue;
    try {
      const d = JSON.parse(t);
      out += d.choices?.[0]?.delta?.content || d.choices?.[0]?.message?.content || d.message?.content || "";
    } catch {}
  }
  return out;
}

function singleChunkStream(content: string): ReadableStream<StreamChunk> {
  return new ReadableStream({
    start(controller) {
      if (content) controller.enqueue({ delta: content, done: false });
      controller.enqueue({ delta: "", done: true });
      controller.close();
    },
  });
}

const OllamaAdapter: ProviderAdapter = {
  id: "ollama",
  label: "Ollama",
  defaultBaseUrl: "http://localhost:11434",
  requiresApiKey: true,
  models: [],
  async fetchModels(config) {
    const base = (config.baseUrl || OllamaAdapter.defaultBaseUrl).replace(/\/$/, "");
    const headers = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined;
    if (isOllamaCloud(base)) {
      const res = await proxyFetch(`${base}/models`, "GET", undefined, undefined, headers);
      if (!res.ok) throw new Error(`Ollama list error: ${res.status} ${await safeText(res)}`);
      const json = await res.json();
      return (json.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: "ollama" as ProviderId,
      }));
    }
    const res = await proxyFetch(`${base}/api/tags`, "GET", undefined, undefined, headers);
    if (!res.ok) throw new Error(`Ollama list error: ${res.status}`);
    const json = await res.json();
    return (json.models || []).map((m: any) => ({
      id: m.model || m.name,
      name: m.name || m.model,
      provider: "ollama" as ProviderId,
      contextWindow: m.details?.context_length,
      description: [m.details?.parameter_size, m.details?.quantization_level, m.details?.family]
        .filter(Boolean).join(" · "),
    }));
  },
  async streamCompletion(config, params) {
    const base = (config.baseUrl || OllamaAdapter.defaultBaseUrl).replace(/\/$/, "");
    const headers = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined;
    if (isOllamaCloud(base)) {
      const res = await proxyFetch(`${base}/chat/completions`, "POST", {
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stream: true,
      }, params.signal, headers);
      if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await safeText(res)}`);
      // Ollama Cloud may answer with an SSE stream, NDJSON, or a single JSON
      // object. Route streamable content types through the (lenient) SSE
      // parser; otherwise read the full body and synthesize a reply.
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("event-stream") || ct.includes("ndjson") || ct.includes("text/plain")) {
        return parseSSEStream(
          res,
          (data) => data.choices?.[0]?.delta?.content || data.message?.content || "",
          // Ollama Cloud reasoning models stream thinking in delta.reasoning
          // while delta.content is empty until the final answer; surface it
          // as live thinking so the bubble is not silent during reasoning.
          (data) => data.choices?.[0]?.delta?.reasoning || ""
        );
      }
      const text = await res.text();
      if (text.trim().startsWith("<")) {
        throw new Error(`Ollama error: received HTML instead of JSON (check Base URL).`);
      }
      const content = extractJsonReply(text);
      return singleChunkStream(content || `(empty response from ${params.model})`);
    }
    const options: Record<string, any> = { temperature: params.temperature ?? 0.7 };
    if (params.maxTokens) options.num_predict = params.maxTokens;

    const res = await proxyFetch(`${base}/api/chat`, "POST", {
      model: params.model,
      messages: toOllamaMessages(params.messages),
      stream: true,
      options,
    }, params.signal, headers);
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    return parseNDJSONStream(res, (data) => data.message?.content || data.message?.thinking || "");
  },
};

const LMStudioAdapter: ProviderAdapter = {
  id: "lmstudio",
  label: "LM Studio",
  defaultBaseUrl: "http://localhost:1234/v1",
  requiresApiKey: false,
  models: [],
  async fetchModels(config) {
    const base = (config.baseUrl || LMStudioAdapter.defaultBaseUrl).replace(/\/$/, "");
    const headers = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined;
    const res = await proxyFetch(`${base}/models`, "GET", undefined, undefined, headers);
    if (!res.ok) throw new Error(`LM Studio list error: ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((m: any) => ({
      id: m.id,
      name: m.id,
      provider: "lmstudio" as ProviderId,
    }));
  },
  async streamCompletion(config, params) {
    const base = (config.baseUrl || LMStudioAdapter.defaultBaseUrl).replace(/\/$/, "");
    const lmHeaders = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined;
    const res = await proxyFetch(`${base}/chat/completions`, "POST", {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      stream: true,
    }, params.signal, lmHeaders);
    if (!res.ok) throw new Error(`LM Studio error: ${res.status}`);
    return parseSSEStream(res, (data) => data.choices?.[0]?.delta?.content || "");
  },
};

const OpenAICompatibleAdapter: ProviderAdapter = {
  id: "openai-compatible",
  label: "Custom (OpenAI-compatible)",
  defaultBaseUrl: "",
  requiresApiKey: true,
  models: [],
  async fetchModels(config) {
    if (!config.baseUrl) throw new Error("Custom provider requires baseUrl");
    const base = config.baseUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/models`, {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
    });
    if (!res.ok) throw new Error(`Custom list error: ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((m: any) => ({
      id: m.id,
      name: m.id,
      provider: "openai-compatible" as ProviderId,
    }));
  },
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
// Multimodal content converters
// OpenAI-family APIs accept ContentPart[] natively; Anthropic and Ollama need
// their own shapes. A data URL is "data:<mime>;base64,<data>".
// ═══════════════════════════════════════════════

function parseDataUrl(url: string): { mime: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  return m ? { mime: m[1], data: m[2] } : null;
}

/** Anthropic image block: { type:"image", source:{type:"base64", media_type, data} }. */
function toAnthropicContent(content: ChatMessage["content"]): any {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    const parsed = parseDataUrl(part.image_url.url);
    if (parsed) {
      return { type: "image", source: { type: "base64", media_type: parsed.mime, data: parsed.data } };
    }
    return { type: "text", text: "[unrenderable image]" };
  });
}

/** Ollama messages: images go in a sibling `images: [base64Data]` array. */
function toOllamaMessages(messages: ChatMessage[]): any[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    let text = "";
    const images: string[] = [];
    for (const part of m.content) {
      if (part.type === "text") text += part.text;
      else {
        const parsed = parseDataUrl(part.image_url.url);
        if (parsed) images.push(parsed.data);
      }
    }
    const out: any = { role: m.role, content: text };
    if (images.length) out.images = images;
    return out;
  });
}

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
  extractDelta: (data: any) => string,
  extractThinking?: (data: any) => string
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
        // Accept "data: {...}", "data:{...}" (no space), bare "[DONE]", and
        // raw NDJSON lines starting with "{" (Ollama Cloud streaming shape).
        let dataStr = "";
        if (trimmed.startsWith("data:")) {
          dataStr = trimmed.slice(5).trimStart();
        } else if (trimmed.startsWith("{")) {
          dataStr = trimmed;
        } else {
          continue;
        }
        if (dataStr === "[DONE]") {
          controller.enqueue({ delta: "", done: true });
          controller.close();
          return;
        }
        try {
          const data = JSON.parse(dataStr);
          const delta = extractDelta(data);
          const thinking = extractThinking ? extractThinking(data) : "";
          const fr = data.choices?.[0]?.finish_reason;
          if (delta) controller.enqueue({ delta, done: false });
          if (thinking) controller.enqueue({ delta: "", thinking, done: false });
          if (fr) controller.enqueue({ delta: "", done: false, finishReason: fr });
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
          if (data.type === "content_block_delta") {
            const d = data.delta;
            if (d?.type === "thinking_delta" && d.thinking) {
              controller.enqueue({ delta: "", thinking: d.thinking, done: false });
            } else if (d?.type === "text_delta" && d.text) {
              controller.enqueue({ delta: d.text, done: false });
            } else if (!d?.type && d?.text) {
              controller.enqueue({ delta: d.text, done: false });
            }
          }
          if (data.type === "message_delta" && data.delta?.stop_reason) {
            controller.enqueue({ delta: "", done: false, finishReason: data.delta.stop_reason });
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
          if (data.done) {
            if (data.done_reason) controller.enqueue({ delta: "", done: false, finishReason: data.done_reason });
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
