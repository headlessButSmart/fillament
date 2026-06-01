import { useCallback, useMemo, useRef, useState } from "react";
import type { FormApi } from "@fillament/core";
import { chatComplete, getOrCreateEngine, type EngineHandle } from "./engine.js";
import { buildChatMessages, extractJsonObject, redactValues } from "./prompt.js";
import { relaxSchemaForPartialUpdate, resolveSchema } from "./schema.js";
import type {
  AIAssistOptions,
  AIAssistStatus,
  AIProgressReport,
  AISuggestion,
} from "./types.js";

export const DEFAULT_MODEL = "Llama-3.2-3B-Instruct-q4f32_1-MLC";

// Convert a possibly-nested `changes` object from the model into a flat
// (path -> value) record matching Fillament's setValue API.
function flattenChanges(input: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      // Already-dotted keys win — only recurse when the key is a single segment.
      if (!k.includes(".")) {
        Object.assign(out, flattenChanges(v as Record<string, unknown>, path));
        continue;
      }
    }
    out[path] = v;
  }
  return out;
}

export type UseAIAssistResult = {
  status: AIAssistStatus;
  progress: AIProgressReport | null;
  lastSuggestion: AISuggestion | null;
  error: string | null;
  modelId: string;

  /** Pre-warm: download + initialize the model now, before the user clicks. */
  preload: () => Promise<void>;
  /** Send a free-text user request, get back a suggestion. Does not apply it. */
  request: (text: string) => Promise<AISuggestion | null>;
  /** Apply a previously-returned suggestion to the form. */
  apply: (suggestion: AISuggestion) => void;
  /** Convenience: request + auto-apply if non-empty. */
  requestAndApply: (text: string) => Promise<AISuggestion | null>;
  /** Reset state (does NOT unload the model). */
  reset: () => void;
};

/**
 * Headless React hook for AI-assisted form filling. Pair with `<FillamentAI>`
 * for the default UI, or render your own and call `request()` / `apply()`.
 */
export function useAIAssist<TValues = any>(
  form: FormApi<TValues>,
  options: AIAssistOptions = {}
): UseAIAssistResult {
  const modelId = options.model ?? DEFAULT_MODEL;
  const enabled = options.enabled !== false;
  const includeValues = options.includeCurrentValues !== false;

  const [status, setStatus] = useState<AIAssistStatus>({ kind: "idle" });
  const [progress, setProgress] = useState<AIProgressReport | null>(null);
  const [lastSuggestion, setLastSuggestion] = useState<AISuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<EngineHandle | null>(null);

  const resolvedSchema = useMemo(
    () => resolveSchema(options.schemaForAI),
    [options.schemaForAI]
  );

  // Effective grammar constraint for WebLLM. Precedence:
  //   1. modelParams.jsonSchema (explicit string from the caller)
  //   2. autoConstrainOutput=true + a resolved schema → relax + stringify it
  //   3. undefined → no grammar constraint, free-form text parsed by us
  const effectiveJsonSchema = useMemo<string | undefined>(() => {
    const explicit = options.modelParams?.jsonSchema;
    if (typeof explicit === "string" && explicit.length > 0) return explicit;
    if (options.autoConstrainOutput && options.schemaForAI) {
      const relaxed = relaxSchemaForPartialUpdate(resolvedSchema);
      // Empty `properties` would mean "no fields at all" — skip in that case
      // so we don't constrain the model to emit literally `{}`.
      const props = (relaxed as { properties?: Record<string, unknown> }).properties;
      if (props && Object.keys(props).length > 0) {
        return JSON.stringify(relaxed);
      }
    }
    return undefined;
  }, [
    options.modelParams?.jsonSchema,
    options.autoConstrainOutput,
    options.schemaForAI,
    resolvedSchema,
  ]);

  const ensureEngine = useCallback(async (): Promise<EngineHandle> => {
    if (engineRef.current) return engineRef.current;
    setStatus({ kind: "loading", report: { progress: 0, text: "Loading model…" } });
    try {
      const handle = await getOrCreateEngine({
        modelId,
        onProgress: (report) => {
          setProgress(report);
          setStatus({ kind: "loading", report });
          options.onProgress?.(report);
        },
      });
      engineRef.current = handle;
      setStatus({ kind: "ready" });
      return handle;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus({ kind: "error", message });
      throw err;
    }
  }, [modelId, options]);

  const preload = useCallback(async () => {
    if (!enabled) return;
    await ensureEngine();
  }, [enabled, ensureEngine]);

  const request = useCallback(
    async (text: string): Promise<AISuggestion | null> => {
      if (!enabled || !text.trim()) return null;
      try {
        const handle = await ensureEngine();
        setStatus({ kind: "thinking" });

        const rawValues = includeValues ? form.getValues() : {};
        const safeValues = redactValues(rawValues, options.redact ?? []);
        const messages = buildChatMessages({
          schema: resolvedSchema,
          values: safeValues,
          request: text,
          systemPrompt: options.systemPrompt,
        });

        const raw = await chatComplete(handle, {
          messages,
          temperature: options.modelParams?.temperature,
          top_p: options.modelParams?.top_p,
          max_tokens: options.modelParams?.max_tokens,
          seed: options.modelParams?.seed,
          jsonSchema: effectiveJsonSchema,
        });

        const parsed = extractJsonObject(raw) ?? {};
        const changes = flattenChanges(parsed);

        const suggestion: AISuggestion = {
          changes,
          raw,
          request: text,
          at: Date.now(),
        };
        setLastSuggestion(suggestion);
        setStatus({ kind: "ready" });
        return suggestion;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus({ kind: "error", message });
        return null;
      }
    },
    [
      effectiveJsonSchema,
      enabled,
      ensureEngine,
      form,
      includeValues,
      options.modelParams?.max_tokens,
      options.modelParams?.seed,
      options.modelParams?.temperature,
      options.modelParams?.top_p,
      options.redact,
      options.systemPrompt,
      resolvedSchema,
    ]
  );

  const apply = useCallback(
    (suggestion: AISuggestion) => {
      for (const [path, value] of Object.entries(suggestion.changes)) {
        form.setValue(path, value, { shouldTouch: true, shouldValidate: true });
      }
      form.emitAnalytics({
        type: "field_changed",
        meta: { source: "@fillament/ai", count: Object.keys(suggestion.changes).length },
      });
    },
    [form]
  );

  const requestAndApply = useCallback(
    async (text: string) => {
      const s = await request(text);
      if (s && Object.keys(s.changes).length > 0) apply(s);
      return s;
    },
    [request, apply]
  );

  const reset = useCallback(() => {
    setLastSuggestion(null);
    setError(null);
    setStatus(engineRef.current ? { kind: "ready" } : { kind: "idle" });
  }, []);

  return {
    status,
    progress,
    lastSuggestion,
    error,
    modelId,
    preload,
    request,
    apply,
    requestAndApply,
    reset,
  };
}
