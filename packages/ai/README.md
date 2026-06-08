# @fillament/ai

In-browser AI assist for [Fillament](https://github.com/headlessButSmart/fillament) forms. The user describes what they want in plain language; an LLM running entirely in their browser via [WebLLM](https://github.com/mlc-ai/web-llm) returns a JSON patch that maps onto your schema; Fillament shows a preview and the user applies it.

- **No server** — the model runs client-side via WebGPU.
- **No keys, no API costs** — bring your own model ID.
- **Privacy-safe** — sensitive field values are redacted before the model ever sees them.
- **Schema-aware** — the model gets a JSON Schema (or fields description) so it knows what to fill.
- **Preview before apply** — users review a diff and approve.

```bash
pnpm add @fillament/ai @mlc-ai/web-llm
```

`@mlc-ai/web-llm` is an optional peer dependency — only loaded when AI is enabled in your form.

---

## Quick start

```tsx
import { FillamentAI } from "@fillament/ai";
import { useForm } from "@fillament/react";

function UserForm() {
  const form = useForm({ schema, defaultValues });
  return (
    <>
      <Form form={form}>{/* …fields… */}</Form>
      <FillamentAI
        form={form}
        enabled
        model="Llama-3.2-3B-Instruct-q4f32_1-MLC"
        schemaForAI={{ type: "zod", schema: UserSchema }}
        position="bottom-right"
      />
    </>
  );
}
```

Click the floating button → describe the answers (`"28yo dev in Madrid, vegetarian"`) → preview the patch → Apply.

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `FillamentAI` | component | Floating button + preview panel. Drop-in default UI. |
| `useAIAssist(form, options?)` | hook | Headless engine — `preload`, `request`, `apply`, `requestAndApply`, `reset`. |
| `DEFAULT_MODEL` | const | The default WebLLM model ID. |
| `getOrCreateEngine(opts)` | function | Low-level engine handle. Most consumers won't need this. |
| `chatComplete(handle, opts)` | function | Run a chat completion against an engine handle. |
| `buildChatMessages(input)` | helper | Construct the system + user + schema messages we send to the model. |
| `extractJsonObject(text)` | helper | Pull a `{…}` object out of free-form LLM text (handles markdown fences). |
| `redactValues(values, extra?)` | helper | Strip sensitive paths from a values object before sending it to the model. |
| `isSensitive(name)` | helper | True for any field whose name matches the built-in sensitive list. |
| `DEFAULT_SYSTEM_PROMPT` | const | The default system prompt; override with `AIAssistOptions.systemPrompt`. |
| `resolveSchema(input)` | helper | Normalize the `AISchemaInput` union into a JSON Schema. |
| `relaxSchemaForPartialUpdate(schema)` | helper | Make a JSON Schema accept any subset of fields, for grammar-constrained sampling. |
| `FillamentAIProps`, `UseAIAssistResult`, `AIAssistOptions`, `AIAssistStatus`, `AIFieldDescription`, `AIModelParams`, `AIProgressReport`, `AISchemaInput`, `AISuggestion`, `EngineHandle`, `ChatCallOptions`, `ChatMessage`, `BuildPromptInput` | types | Full type surface. |

---

## `<FillamentAI>`

The default UI — a floating action button that opens a preview panel.

```tsx
<FillamentAI
  form={form}
  enabled={user.featureFlags.aiAssist}
  model="Llama-3.2-3B-Instruct-q4f32_1-MLC"
  modelParams={{ temperature: 0.4, max_tokens: 512 }}
  schemaForAI={{ type: "zod", schema: UserSchema }}
  redact={["secret_passcode"]}
  includeCurrentValues={true}
  autoConstrainOutput={false}
  position="bottom-right"
  triggerLabel="AI assist"
  panelTitle="Fill with AI"
  placeholder="Describe the user…"
  preloadOnMount={false}
  onProgress={(r) => console.log(r.text, r.progress)}
/>
```

### `FillamentAIProps<TValues>`

Extends `AIAssistOptions` plus:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `form` | `FormApi<TValues>` | **required** | The Fillament form to fill. |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right"` | `"bottom-right"` | FAB position. |
| `triggerLabel` | `string` | `"AI assist"` | Button label and `aria-label`. |
| `panelTitle` | `string` | `"Fill with AI"` | Preview panel heading. |
| `placeholder` | `string` | a friendly default | Textarea placeholder. |
| `preloadOnMount` | `boolean` | `false` | Start downloading the model on mount instead of on first click. |

If `enabled === false`, renders nothing.

---

## `useAIAssist(form, options?)`

Headless hook. Use it when you want your own UI (sidebar, modal, command palette) instead of the floating FAB.

```tsx
const ai = useAIAssist(form, {
  model: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
  schemaForAI: { type: "json-schema", schema },
  redact: ["password"],
});

await ai.preload();                                  // download model now
const suggestion = await ai.request("28yo dev");      // returns AISuggestion | null
ai.apply(suggestion!);                                // commit the changes to the form
// or in one shot:
await ai.requestAndApply("28yo dev in Madrid");
```

### `AIAssistOptions`
| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | When `false`, all methods short-circuit. |
| `model` | `string` | `DEFAULT_MODEL` | WebLLM model ID. See [the model list](https://github.com/mlc-ai/web-llm#model-list). |
| `modelParams` | `AIModelParams` | — | `{ temperature?, top_p?, max_tokens?, seed?, jsonSchema? }`. |
| `systemPrompt` | `string` | `DEFAULT_SYSTEM_PROMPT` | Override the system prompt entirely. |
| `schemaForAI` | `AISchemaInput \| JSON Schema object` | — | Tell the model what fields it can fill. **Strongly recommended.** Accepts a JSON Schema object directly, or `{ type: "json-schema" \| "zod" \| "fields", … }`. |
| `redact` | `ReadonlyArray<string>` | — | Field paths to strip before the model sees the current values. Adds to the built-in sensitive list. |
| `includeCurrentValues` | `boolean` | `true` | Send `form.getValues()` (post-redaction) as context. Disable for "fill from scratch" UX. |
| `autoConstrainOutput` | `boolean` | `false` | When `true` and `schemaForAI` is set, derive a partial-friendly JSON Schema and pass it to WebLLM as a grammar constraint. Slower per token but guarantees parseable JSON. |
| `onProgress` | `(report: AIProgressReport) => void` | — | Stream model-load progress. |

### `UseAIAssistResult`
| Member | Signature | Notes |
| --- | --- | --- |
| `status` | `AIAssistStatus` | `{ kind: "idle" \| "loading" \| "ready" \| "thinking" \| "error" }` (loading includes `report`, error includes `message`). |
| `progress` | `AIProgressReport \| null` | Latest progress snapshot during model load. |
| `lastSuggestion` | `AISuggestion \| null` | Most recent suggestion (kept so you can re-render the panel). |
| `error` | `string \| null` | Latest error message. |
| `modelId` | `string` | The resolved model ID. |
| `preload()` | `() => Promise<void>` | Download + initialize the model. Safe to call multiple times. |
| `request(text)` | `(string) => Promise<AISuggestion \| null>` | Run a prompt; does NOT apply. Returns `null` if disabled or text empty. |
| `apply(suggestion)` | `(AISuggestion) => void` | Apply changes via `form.setValue`; emits a `field_changed` analytics event tagged `@fillament/ai`. |
| `requestAndApply(text)` | `(string) => Promise<AISuggestion \| null>` | Convenience — only applies if `changes` is non-empty. |
| `reset()` | `() => void` | Clear `lastSuggestion` / `error` / status (does NOT unload the model). |

---

## `AISchemaInput`

Three ways to describe the form to the model:

```ts
// 1) Raw JSON Schema
{ type: "json-schema", schema: { type: "object", properties: { … } } }

// 2) Per-field descriptions
{ type: "fields", fields: {
    fullName: { type: "string", description: "Full legal name" },
    role:     { type: "string", enum: ["dev", "designer", "pm"] },
    email:    { type: "string", format: "email", required: true },
  } }

// 3) Pass a Zod schema and let us introspect
{ type: "zod", schema: UserSchema }
```

You can also pass a bare JSON Schema object — Fillament auto-detects it.

### `AIFieldDescription`
```ts
{
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  format?: string;     // e.g. "email", "date"
  enum?: Array<string | number>;
  required?: boolean;
}
```

---

## `AISuggestion`

```ts
interface AISuggestion {
  changes: Record<string, unknown>;  // flat path → value
  raw: string;                        // raw assistant text reply
  request: string;                    // the prompt the user typed
  at: number;                         // Date.now() timestamp
}
```

`changes` is flat-pathed (`"address.city": "Lisbon"`, not nested) so `apply` can call `form.setValue(path, value)` directly. Nested objects returned by the model are flattened automatically.

---

## Redaction

Sensitive field values are stripped before the model sees them. The built-in list is shared with `@fillament/analytics`:

```
password, passcode, token, secret, ssn, socialSecurityNumber, cardNumber,
creditCard, cvv, cvc, iban, routingNumber, accountNumber, dob, dateOfBirth,
phone, email, address
```

Add your own via `redact: ["internal.notes", "patientId"]`. Pass `redact: []` to keep the defaults only.

`isSensitive(name)` and `redactValues(values, extra?)` are exported so you can reuse the same logic elsewhere.

---

## Grammar-constrained sampling (optional)

By default, the model returns free-form text and we parse out the JSON. Pass `autoConstrainOutput: true` (with `schemaForAI`) and we'll derive a partial-friendly JSON Schema and pass it to WebLLM as a grammar constraint — eliminating JSON-parse failures at a small per-token cost.

For full control, pass `modelParams.jsonSchema` (an already-stringified JSON Schema). Precedence:

1. `modelParams.jsonSchema` (explicit string) wins.
2. `autoConstrainOutput: true` + `schemaForAI` derives a relaxed schema and uses it.
3. Otherwise, no constraint.

---

## Low-level: engine + chat helpers

For custom integrations:

```ts
import { getOrCreateEngine, chatComplete, buildChatMessages } from "@fillament/ai";

const engine = await getOrCreateEngine({ modelId: "…", onProgress: (r) => …});
const messages = buildChatMessages({
  schema: resolvedJsonSchema,
  values: safeValues,
  request: "fill profile",
  systemPrompt: "You are a JSON fill assistant…",
});
const raw = await chatComplete(engine, { messages, temperature: 0.5, max_tokens: 512 });
const parsed = extractJsonObject(raw);
```

Engines are cached per model ID — subsequent `getOrCreateEngine` calls with the same ID return the existing handle.

`ChatCallOptions`: `{ messages, temperature?, top_p?, max_tokens?, seed?, jsonSchema? }`.

---

## Security & privacy

- The model runs entirely client-side — values never leave the browser.
- Sensitive paths are redacted before the model sees them; the `redact` option is additive to the built-in list.
- The Apply step emits one `field_changed` analytics event tagged `@fillament/ai` so you can attribute / audit AI fills.
- The model and its weights are downloaded from WebLLM's CDN on first use and cached in IndexedDB.

---

## License

MIT © headlessButSmart
