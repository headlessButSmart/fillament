# @fillament/mega

**Everything Fillament in one install. Batteries included.**

`@fillament/mega` is the fat package: it bundles every Fillament module **and** their supporting libraries — Zod, Yup, AJV, the WebLLM engine, and the MCP bridge — as regular dependencies. One `pnpm add @fillament/mega` and the whole toolkit works, no manual peer wrangling. React is the only thing you bring (and npm 7+ / pnpm 8+ install it for you automatically as a peer).

```bash
pnpm add @fillament/mega
```

It stays lean anyway: every entry is a thin re-export and `sideEffects: false`, so your bundler tree-shakes everything you don't import. The node_modules folder is fat; your production bundle is not.

## Usage

The root entry is the kitchen sink — core engine plus React bindings together:

```tsx
import { z } from "zod";
import { useForm, Form, Field, createValidationAdapter } from "@fillament/mega";
import { zodAdapter } from "@fillament/mega/zod";
import { FillamentDevTools } from "@fillament/mega/devtools";
import { createStoragePersistPlugin } from "@fillament/mega/persist";

const form = useForm({
  schema: zodAdapter(z.object({ email: z.string().email() })),
  defaultValues: { email: "" },
  plugins: [createStoragePersistPlugin({ key: "signup" })],
});
```

## Entry points

| Import | Re-exports |
| --- | --- |
| `@fillament/mega` | [`@fillament/core`](../core) + [`@fillament/react`](../react) — `useForm`, `Form`, `Field`, `FieldArray`, `FieldArrayTable`, `FieldsRenderer`, `createForm`, adapter API |
| `@fillament/mega/react` | [`@fillament/react`](../react) (same as root, for symmetry) |
| `@fillament/mega/zod` | [`@fillament/zod`](../zod) — zod is bundled |
| `@fillament/mega/yup` | [`@fillament/yup`](../yup) — yup is bundled |
| `@fillament/mega/json-schema` | [`@fillament/json-schema`](../json-schema) — AJV is bundled |
| `@fillament/mega/ai` | [`@fillament/ai`](../ai) — `@mlc-ai/web-llm` is bundled, loaded with dynamic `import()` |
| `@fillament/mega/webmcp` | [`@fillament/webmcp`](../webmcp) |
| `@fillament/mega/webmcp/mcp-b` | MCP-B bridge — `@modelcontextprotocol/sdk` + `@mcp-b/transports` are bundled |
| `@fillament/mega/blueprints` | [`@fillament/blueprints`](../blueprints) — all catalogs |
| `@fillament/mega/blueprints/auth` · `/contact` · `/survey` · `/commerce` · `/onboarding` | Individual blueprint catalogs |
| `@fillament/mega/test-data` | [`@fillament/test-data`](../test-data) |
| `@fillament/mega/test-data/devtools` | One-click DevTools fill button |
| `@fillament/mega/persist` | [`@fillament/persist`](../persist) |
| `@fillament/mega/remote` | [`@fillament/remote`](../remote) |
| `@fillament/mega/redux` | [`@fillament/redux`](../redux) — bring your own store |
| `@fillament/mega/i18n` | [`@fillament/i18n`](../i18n) |
| `@fillament/mega/analytics` | [`@fillament/analytics`](../analytics) |
| `@fillament/mega/devtools` | [`@fillament/devtools`](../devtools) |
| `@fillament/mega/formik-compat` | [`@fillament/formik-compat`](../formik-compat) — drop-in Formik |

## Why React is a peer, not a dependency

Shipping a private copy of React inside a library is the classic way to end up with two React instances and broken hooks. So `react` / `react-dom` are declared as **required peer dependencies** instead — modern package managers (npm ≥ 7, pnpm ≥ 8) install them automatically, and your app keeps a single React.

## How it stays tree-shakable

- **Thin re-exports** — every entry is a one-line `export *` from the underlying package; mega adds no code of its own.
- **`sideEffects: false` ESM** — bundlers drop every entry and symbol you don't import. Importing `@fillament/mega/persist` costs exactly what importing `@fillament/persist` costs.
- **Heavy deps load lazily** — WebLLM and the MCP SDK are only touched via dynamic `import()` inside `/ai` and `/webmcp/mcp-b`, so they never enter your bundle unless those features run.
- **Same versions** — mega pins the workspace versions of all 16 packages, so one install always gives you a coherent set.

Prefer per-package installs (`@fillament/react`, `@fillament/zod`, …) if you want minimal node_modules and explicit dependency bookkeeping — both styles are interchangeable, since mega re-exports the very same modules.

## License

MIT — like every Fillament package, free with no feature gates.
