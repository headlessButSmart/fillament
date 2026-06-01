# @fillament/ai

In-browser AI assist for [Fillament](https://github.com/headlessButSmart/fillament) forms. The user describes what they want in plain language, an LLM running **entirely in their browser** ([WebLLM](https://github.com/mlc-ai/web-llm)) returns a JSON patch that maps onto your schema, and Fillament applies it.

- **No server** — the model runs client-side via WebGPU
- **No keys** — bring your own model, no API costs
- **Privacy-safe** — sensitive field values are redacted before being shown to the model
- **Schema-aware** — the model gets a JSON Schema description of the fields it can fill
- **Preview before apply** — users see a diff and approve before any field changes
- **Configurable** — feature flag, model ID, temperature, max tokens, position, system prompt

```bash
pnpm add @fillament/ai @mlc-ai/web-llm
```

```tsx
import { FillamentAI } from "@fillament/ai";

<FillamentAI
  form={form}
  enabled
  model="Llama-3.2-3B-Instruct-q4f32_1-MLC"
  modelParams={{ temperature: 0.5, max_tokens: 512 }}
  schemaForAI={UserJsonSchema}     // optional but recommended
  position="bottom-right"
/>
```

Open the floating button → describe the user (“28yo dev in SF, married, vegetarian”) → review the proposed changes → click Apply.

See the [project README](https://github.com/headlessButSmart/fillament#readme) and the Storybook for a working demo.

## License

MIT © headlessButSmart
