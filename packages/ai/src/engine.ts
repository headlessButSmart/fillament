import type { AIProgressReport } from "./types.js";
import type { ChatMessage } from "./prompt.js";

// We deliberately don't import @mlc-ai/web-llm at module top level — it's an
// optional peer dep that pulls in a chunky runtime. Callers load it on demand
// when the user actually opens the AI panel.

export type EngineHandle = {
  modelId: string;
  // The underlying MLCEngine instance, typed loosely so we don't depend on the
  // package at build time.
  engine: unknown;
};

type EngineLoadOptions = {
  modelId: string;
  onProgress?: (report: AIProgressReport) => void;
};

// Map of modelId → load promise. Subsequent calls await the in-flight load
// rather than spawning a second instance.
const cache = new Map<string, Promise<EngineHandle>>();

async function loadWebLLM(): Promise<typeof import("@mlc-ai/web-llm")> {
  try {
    // Dynamic import keeps WebLLM out of the main bundle until the AI feature
    // is actually used. Vite / webpack will code-split this automatically.
    return await import("@mlc-ai/web-llm");
  } catch (err) {
    const hint =
      "[@fillament/ai] Failed to import @mlc-ai/web-llm. Install it as a peer dependency:\n" +
      "  pnpm add @mlc-ai/web-llm";
    throw new Error(`${hint}\n\nOriginal error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function getOrCreateEngine(options: EngineLoadOptions): Promise<EngineHandle> {
  const existing = cache.get(options.modelId);
  if (existing) return existing;

  const promise = (async () => {
    const webllm = await loadWebLLM();
    const engine = await webllm.CreateMLCEngine(options.modelId, {
      initProgressCallback: (report) => {
        options.onProgress?.({
          progress: typeof report.progress === "number" ? report.progress : 0,
          text: report.text ?? "",
          timeElapsed: report.timeElapsed,
        });
      },
    });
    return { modelId: options.modelId, engine };
  })();

  cache.set(options.modelId, promise);
  // If load fails, clear the cache so a retry actually retries.
  promise.catch(() => cache.delete(options.modelId));
  return promise;
}

export type ChatCallOptions = {
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  seed?: number;
  /**
   * Optional JSON Schema string. When provided, WebLLM constrains the model's
   * output to valid JSON matching this schema (grammar-constrained sampling).
   * If omitted, we fall back to free-form text + our extractJsonObject() parser.
   *
   * IMPORTANT: WebLLM's emscripten binding throws
   *   "BindingError: Cannot pass non-string to std::string"
   * if you pass `response_format: { type: "json_object" }` without a schema
   * string. So we either pass both, or neither — never a half-formed
   * response_format object.
   */
  jsonSchema?: string;
};

export async function chatComplete(handle: EngineHandle, options: ChatCallOptions): Promise<string> {
  // The MLCEngine exposes an OpenAI-compatible `chat.completions.create` API.
  const engine = handle.engine as {
    chat: {
      completions: {
        create: (req: Record<string, unknown>) => Promise<{
          choices: Array<{ message: { content: string } }>;
        }>;
      };
    };
  };

  // Construct the request with only the fields the user actually set. WebLLM's
  // WASM bindings are picky about `undefined` and will sometimes crash trying
  // to marshal it into a C++ std::string.
  const req: Record<string, unknown> = {
    messages: options.messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.max_tokens ?? 512,
    stream: false,
  };
  if (typeof options.top_p === "number") req.top_p = options.top_p;
  if (typeof options.seed === "number") req.seed = options.seed;
  if (typeof options.jsonSchema === "string" && options.jsonSchema.length > 0) {
    req.response_format = { type: "json_object", schema: options.jsonSchema };
  }

  const response = await engine.chat.completions.create(req);
  return response.choices?.[0]?.message?.content ?? "";
}

/** Test-only escape hatch — clears the engine cache. Do not call in app code. */
export function __resetEngineCache(): void {
  cache.clear();
}
