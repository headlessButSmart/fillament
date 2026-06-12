# `@fillament/webmcp`

Expose Fillament forms to in-browser AI agents as [WebMCP](https://github.com/webmachinelearning/webmcp) / [MCP](https://modelcontextprotocol.io) tools. **Optional.** Nothing else in Fillament depends on it.

```bash
pnpm add @fillament/webmcp
```

Each form gets up to three tools, derived from its validation schema via core's `introspectForm()`:

- `<name>_get_state` — values (sensitive paths redacted), errors, `isValid`, `canSubmit`
- `<name>_fill` — partial updates, dot-paths allowed; runs real validation and returns the result
- `<name>_submit` — **disabled by default**; validate-then-submit when enabled

## Minimal example

```ts
import { useForm } from "@fillament/react";
import { webmcpPlugin } from "@fillament/webmcp";

const form = useForm({
  schema: zodAdapter(CheckoutSchema),
  plugins: [
    webmcpPlugin({
      name: "checkout",
      description: "Checkout form for the user's current cart.",
    }),
  ],
});
```

Tools register on form init and unregister on teardown. The default registrar targets the W3C `navigator.modelContext` API and silently no-ops where it doesn't exist — safe to ship unconditionally.

## Today's browsers: the MCP-B bridge

`navigator.modelContext` is still behind flags. To serve agents now, run an in-page MCP server over [`@mcp-b/transports`](https://github.com/MiguelsPizza/WebMCP)' tab transport (clients connect through the MCP-B browser extension):

```bash
pnpm add @modelcontextprotocol/sdk @mcp-b/transports   # optional peers
```

```ts
import { createMcpBRegistrar } from "@fillament/webmcp/mcp-b";

const registrar = await createMcpBRegistrar({
  name: "my-shop",
  allowedOrigins: ["https://my-shop.example"],
});

useForm({ schema, plugins: [webmcpPlugin({ name: "checkout", registrar })] });
```

The optional peers are loaded with dynamic `import()` — apps that don't use the `/mcp-b` entry never download them.

## Enabling submit

```ts
webmcpPlugin({
  expose: { submit: true },
  confirmSubmit: async (values) =>
    window.confirm("The assistant wants to submit this form. Allow?"),
});
```

`_submit` always validates first and refuses (returning the errors) while the form is invalid. `confirmSubmit` puts a human in the loop; returning `false` or throwing blocks the submit.

## Redaction

`_get_state` hides values at paths matching `password`, `token`, `secret`, `card`, `cvv`, `ssn`, `iban`, `pin`, … Add your own with `redact: ["internalNotes"]` or replace the predicate with `redact: (path) => …`. Agents can still *fill* those fields; they just can't read them back.

## When NOT to use this

If your form handles payments, legal consent, or anything where an automated fill could cause harm, either don't register it or expose only `get_state`. Tool exposure is per-form and opt-in by design.

See the [package README](../packages/webmcp/README.md) for the full option and export reference.
