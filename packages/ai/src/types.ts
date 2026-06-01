export type AIModelParams = {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  seed?: number;
  /**
   * Optional JSON Schema STRING (already JSON.stringify'd). When provided,
   * WebLLM constrains the model's output to valid JSON matching this schema
   * via grammar-constrained sampling. Use this if you want a hard guarantee
   * that the model emits parseable JSON.
   *
   * Without it, the model returns free-form text and Fillament's
   * `extractJsonObject` parses out the JSON block (which handles markdown
   * fences and prose). This is the default — most small instruct models
   * cooperate without grammar constraints, and grammar constraints slow
   * generation.
   *
   * Note: do NOT pass an object — WebLLM's emscripten binding requires a
   * string here. The default `undefined` is the safe choice; only set this
   * if you have a stable JSON Schema serialization for your form.
   */
  jsonSchema?: string;
};

export type AIProgressReport = {
  // 0..1 progress fraction (model download / shader compile / etc.)
  progress: number;
  // Human-readable status string from WebLLM
  text: string;
  // Estimated total seconds remaining, if WebLLM can provide it.
  timeElapsed?: number;
};

export type AISchemaInput =
  // 1) Pass a JSON Schema object — most direct.
  | { type: "json-schema"; schema: Record<string, unknown> }
  // 2) Pass a description object: { fieldPath: { description, format, ... } }
  | { type: "fields"; fields: Record<string, AIFieldDescription> }
  // 3) Pass a raw Zod schema — we will introspect it.
  | { type: "zod"; schema: unknown };

export type AIFieldDescription = {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  format?: string; // e.g. "email", "date"
  enum?: Array<string | number>;
  required?: boolean;
};

export type AIAssistOptions = {
  enabled?: boolean;
  // WebLLM model ID — see https://github.com/mlc-ai/web-llm#model-list
  // Defaults to a small instruct model that downloads quickly.
  model?: string;
  modelParams?: AIModelParams;
  // Override the default system prompt entirely.
  systemPrompt?: string;
  // Description of the form schema, passed to the model.
  schemaForAI?: AISchemaInput | Record<string, unknown>;
  // Field names whose VALUES should be redacted before the model sees them.
  // Defaults to the privacy-safe sensitive-name detector from @fillament/analytics.
  redact?: ReadonlyArray<string>;
  // Whether to send current form values as context. Defaults to true.
  // Even with this enabled, values from redacted fields are stripped first.
  includeCurrentValues?: boolean;
  /**
   * When true (and `schemaForAI` is set), derive a partial-friendly JSON Schema
   * from `schemaForAI` and pass it as a grammar constraint to WebLLM, forcing
   * the model to emit only valid JSON matching your form's shape.
   *
   * Precedence is: `modelParams.jsonSchema` (explicit string) wins over this
   * auto-derivation, which wins over no constraint.
   *
   * Trade-off: grammar-constrained sampling is slightly slower per token but
   * eliminates JSON-parse failures. Defaults to `false` to keep latency low
   * on small instruct models that follow JSON instructions reliably.
   */
  autoConstrainOutput?: boolean;
  // Custom callback for streaming progress updates during model load.
  onProgress?: (report: AIProgressReport) => void;
};

export type AISuggestion = {
  // The flat path → new value object proposed by the model.
  changes: Record<string, unknown>;
  // The raw assistant text reply, for display in the modal.
  raw: string;
  // The user request that produced this suggestion.
  request: string;
  // Timestamp for telemetry.
  at: number;
};

export type AIAssistStatus =
  | { kind: "idle" }
  | { kind: "loading"; report: AIProgressReport }
  | { kind: "ready" }
  | { kind: "thinking" }
  | { kind: "error"; message: string };
