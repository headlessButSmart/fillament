# @fillament/webmcp

WebMCP for [Fillament](https://github.com/headlessButSmart/fillament) forms. Expose any form to in-browser AI agents as [Model Context Protocol](https://modelcontextprotocol.io) tools — the agent reads the form's state, fills fields against the **real validation schema**, and (only if you allow it) submits.

```bash
pnpm add @fillament/webmcp
```

Tree-shakeable, side-effect-free, zero dependencies in the main entry. The tools are derived from your validation schema via `introspect()` — no duplicate field definitions, no prompt engineering.

---

## What an agent sees

Three MCP tools per form (names prefixed with your `name` option or the form id):

| Tool | Default | What it does |
| --- | --- | --- |
| `<name>_get_state` | ✅ on | Returns values (sensitive fields redacted), per-field errors, `isValid`, `canSubmit`. |
| `<name>_fill` | ✅ on | Patches values — flat keys or dot-paths (`address.city`) — then validates and returns the result so the agent can self-correct. Its `inputSchema` is your validation schema, relaxed for partial updates. |
| `<name>_submit` | ❌ **off** | Validates, then submits. Must be enabled with `expose: { submit: true }`; can be gated with `confirmSubmit`. |

The agent's loop is exactly the one you'd want: *read → fill → check errors → fix → (ask the user) → submit*.

---

## Quick start

```tsx
import { useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { webmcpPlugin } from "@fillament/webmcp";

const form = useForm({
  schema: zodAdapter(CheckoutSchema),
  defaultValues,
  plugins: [
    webmcpPlugin({
      name: "checkout",
      description: "Checkout form for the user's current cart.",
    }),
  ],
});
```

That's it. Tools register on form init and unregister on teardown. By default they target the **W3C Web Model Context API** (`navigator.modelContext`) and silently no-op where the API isn't available — safe to ship unconditionally.

> The Web Model Context API is an early-stage proposal (behind flags in Chromium). To serve agents **in today's browsers**, use the MCP-B bridge below.

---

## Usable today: the `/mcp-b` bridge

The `@fillament/webmcp/mcp-b` entry runs a real MCP server inside your page over [`@mcp-b/transports`](https://github.com/MiguelsPizza/WebMCP)' tab transport. Any MCP client connected through the WebMCP/MCP-B browser extension can call your form tools right now.

```bash
pnpm add @modelcontextprotocol/sdk @mcp-b/transports
```

Both are **optional peer dependencies** — apps that only use the main entry never download them.

```tsx
import { webmcpPlugin } from "@fillament/webmcp";
import { createMcpBRegistrar } from "@fillament/webmcp/mcp-b";

// Once per page:
const registrar = await createMcpBRegistrar({
  name: "my-shop",                       // MCP server name shown to clients
  allowedOrigins: ["https://my-shop.example"], // restrict in production
});

// Per form:
const form = useForm({
  schema,
  plugins: [webmcpPlugin({ name: "checkout", registrar })],
});

// On page teardown:
await registrar.close();
```

`registrar.register()` / unregister emit MCP `tools/list_changed` notifications, so connected agents see forms appear and disappear as your app navigates.

---

## Exports

### `@fillament/webmcp`

| Export | Kind | Purpose |
| --- | --- | --- |
| `webmcpPlugin(options)` | factory | `FillamentPlugin` — registers tools in `onInit`, unregisters on teardown. |
| `registerFormWithWebMCP(form, options)` | function | Imperative variant. Returns an unregister function. |
| `buildFormTools(form, options)` | function | Builds the `WebMCPTool[]` without registering — bring your own transport. |
| `createModelContextRegistrar()` | factory | The default registrar targeting `navigator.modelContext`. |
| `isModelContextAvailable()` | helper | Feature-detect the W3C API. |
| `relaxForPartialUpdate(schema)` | helper | Drop `required` recursively — what `_fill` does to your schema. |
| `flattenPatch(obj)` | helper | Nested object → dot-path leaves. |
| `sanitizeToolName(name)` | helper | Force `[a-zA-Z0-9_-]` MCP-safe names. |
| `defaultIsSensitivePath(path)` | helper | The built-in redaction predicate. |
| `WebMCPOptions`, `WebMCPTool`, `WebMCPToolResult`, `ToolRegistrar`, `WebMCPExposeOptions` | types | |

### `@fillament/webmcp/mcp-b`

| Export | Kind | Purpose |
| --- | --- | --- |
| `createMcpBRegistrar(options)` | async factory | In-page MCP server over the MCP-B tab transport. Returns a `ToolRegistrar` with `close()`. |
| `McpBRegistrarOptions`, `McpBRegistrarHandle`, `McpBModules` | types | `McpBModules` is a DI seam for tests. |

---

## `WebMCPOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | form id | Tool-name prefix. Sanitized to `[a-zA-Z0-9_-]`. Pick something meaningful (`"checkout"`, not `"form_7f3a"`). |
| `description` | `string` | — | Appended to every tool description. **Strongly recommended** — this is how the agent knows what the form is for. |
| `expose.read` | `boolean` | `true` | Register `_get_state`. |
| `expose.fill` | `boolean` | `true` | Register `_fill`. |
| `expose.submit` | `boolean` | **`false`** | Register `_submit`. Off by default by design. |
| `confirmSubmit` | `(values) => boolean \| Promise<boolean>` | — | Gate on agent-initiated submits. Return `false` (or throw) to block. Show your own confirmation UI here. |
| `redact` | `string[] \| (path) => boolean` | built-ins | Paths hidden from `_get_state` results. String entries are path prefixes, merged with the built-in patterns (`password`, `token`, `secret`, `card`, `cvv`, `ssn`, `iban`, `pin`, …). A function replaces the built-ins entirely. |
| `registrar` | `ToolRegistrar` | `createModelContextRegistrar()` | Where tools go. Pass the `/mcp-b` registrar for today's browsers, or your own. |

---

## Safety model

Letting a page agent touch forms deserves explicit choices. The defaults are conservative:

1. **Submit is off by default.** An agent can fill and validate, but a human presses the button — unless you opt in with `expose: { submit: true }`.
2. **`confirmSubmit` puts a human in the loop** even when submit is exposed:

   ```ts
   webmcpPlugin({
     expose: { submit: true },
     confirmSubmit: async (values) =>
       window.confirm("The assistant wants to submit this form. Allow?"),
   });
   ```

3. **Sensitive values never leave the page.** `_get_state` replaces values at paths matching the built-in patterns with `"[redacted]"`. The agent can still *fill* a password field — it just can't read one back.
4. **Validation is authoritative.** `_fill` and `_submit` run your real adapter; an agent cannot bypass it. `_submit` refuses to run while the form is invalid and reports the errors instead.
5. **Plugin isolation.** Tool registration failures are caught by core's plugin wiring and can never break the form itself.

---

## Custom registrars

A `ToolRegistrar` is one method:

```ts
type ToolRegistrar = {
  register(tool: WebMCPTool): () => void; // returns unregister
};
```

Useful when you already have an MCP server elsewhere (an extension, an Electron bridge, a test harness):

```ts
const myRegistrar: ToolRegistrar = {
  register(tool) {
    myServer.addTool(tool.name, tool.inputSchema, tool.execute);
    return () => myServer.removeTool(tool.name);
  },
};
webmcpPlugin({ registrar: myRegistrar });
```

`buildFormTools(form, options)` gives you the raw tool list if you don't want registration at all.

---

## Schema quality = agent quality

The `_fill` inputSchema comes from `introspectForm(form)` ([core](https://github.com/headlessButSmart/fillament/tree/main/packages/core)):

- `@fillament/zod`, `@fillament/yup`, `@fillament/json-schema` adapters all implement `introspect()` — types, formats, enums, min/max, and `describe()`/`label()` descriptions all flow through to the agent.
- Forms without an adapter fall back to shape inference from `defaultValues` (types only).

The richer your schema, the better the agent fills it. `z.string().email().describe("Work email, not personal")` is an instruction the agent will follow.

---

## Testing

Use a mock registrar and drive the tools directly:

```ts
import { createForm } from "@fillament/core";
import { buildFormTools } from "@fillament/webmcp";

const form = createForm({ schema: adapter, defaultValues });
const fill = buildFormTools(form, { name: "f" }).find((t) => t.name === "f_fill")!;

const result = JSON.parse((await fill.execute({ email: "a@b.com" })).content[0].text);
expect(result.valid).toBe(true);
```

The `/mcp-b` entry accepts injected modules (`McpBModules`) so its registrar is unit-testable without the optional dependencies installed.

---

## License

MIT © headlessButSmart
