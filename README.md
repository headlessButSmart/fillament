<div align="center">

# Fillament

**Type-safe forms for complex React flows.**

A modern Formik alternative for large React teams. Type-safe field paths, granular re-renders, first-class conditional flows, built-in DevTools, privacy-safe analytics, a drop-in Formik compatibility layer — and now **in-browser AI form fill** that never leaks data to a server.

[![Tests](https://img.shields.io/badge/tests-68%2F68-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Free DevTools](https://img.shields.io/badge/DevTools-free-success)]()
[![Free Analytics](https://img.shields.io/badge/Analytics-free-success)]()
[![Local AI](https://img.shields.io/badge/AI-WebLLM%20local-7c3aed)]()

[GitHub](https://github.com/headlessButSmart/fillament) · [Issues](https://github.com/headlessButSmart/fillament/issues)

</div>

---

## Why Fillament

| | Fillament | Formik | React Hook Form |
| --- | :---: | :---: | :---: |
| Type-safe field paths inferred from your value type | ✅ | ⚠️ | ✅ |
| Renders only the field that changed | ✅ | ❌ | ✅ |
| First-class conditional fields with safe expression strings | ✅ | ❌ | ⚠️ |
| Field arrays with stable per-row keys across reorder | ✅ | ⚠️ | ✅ |
| Spreadsheet-style array editing (`FieldArrayTable`) | ✅ | ❌ | ❌ |
| Pluggable validation (Zod / Yup / JSON Schema / custom / inline) | ✅ | ⚠️ | ✅ |
| Built-in DevTools panel (free) | ✅ | ❌ | ✅ |
| Privacy-safe analytics (free) | ✅ | ❌ | ❌ |
| JSON-driven dynamic field rendering | ✅ | ❌ | ⚠️ |
| Design-system component registry | ✅ | ⚠️ | ⚠️ |
| In-browser AI form fill (WebLLM, no server) | ✅ | ❌ | ❌ |
| Formik drop-in compatibility | ✅ | — | ❌ |

> DevTools, analytics, **and AI assist are free and open-source** — never gated behind a paid license. The AI feature runs entirely in the user's browser via WebLLM; no API keys, no values ever leave the device.

---

## Quick start

```bash
pnpm add @fillament/react @fillament/zod @fillament/devtools
# pick whichever validators you need:
pnpm add @fillament/json-schema    # JSON Schema (AJV)
pnpm add @fillament/analytics      # privacy-safe analytics
```

```tsx
import { z } from "zod";
import { useForm, Form, Field } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";
import { FillamentDevTools } from "@fillament/devtools";

const UserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export function UserForm() {
  const form = useForm({
    schema: zodAdapter(UserSchema),
    defaultValues: { email: "", firstName: "", lastName: "" },
  });

  return (
    <>
      <Form form={form} onSubmit={(values) => console.log(values)}>
        <Field name="email" label="Email" type="email" required />
        <Field name="firstName" label="First name" required />
        <Field name="lastName" label="Last name" required />
        <button type="submit">Save</button>
      </Form>
      <FillamentDevTools form={form} />
    </>
  );
}
```

---

## Packages

| Package | Description | Status |
| --- | --- | :---: |
| [`@fillament/core`](packages/core) | Framework-agnostic form engine, field registry, validation orchestration | ✅ |
| [`@fillament/react`](packages/react) | React bindings: `useForm`, `Form`, `Field`, `FieldArray`, `FieldArrayTable`, `FieldsRenderer` | ✅ |
| [`@fillament/zod`](packages/zod) | Zod validation adapter | ✅ |
| [`@fillament/yup`](packages/yup) | Yup validation adapter | ✅ |
| [`@fillament/json-schema`](packages/json-schema) | JSON Schema adapter (AJV + ajv-formats) | ✅ |
| [`@fillament/analytics`](packages/analytics) | Privacy-safe analytics with sensitive-field redaction | ✅ |
| [`@fillament/devtools`](packages/devtools) | In-app DevTools panel | ✅ |
| [`@fillament/formik-compat`](packages/formik-compat) | Drop-in Formik compatibility layer | ✅ |
| [`@fillament/ai`](packages/ai) | In-browser AI fill assist via WebLLM — schema-aware, privacy-safe | ✅ |
| `@fillament/codemod` | `npx @fillament/codemod migrate-formik ./src` | 🛠️ planned |

---

## Optional modules

Fillament keeps advanced capabilities in optional, tree-shakeable modules. None of these are imported by `@fillament/core` or `@fillament/react` — your base bundle is unchanged until you `pnpm add` one of them.

- [`@fillament/persist`](packages/persist) — auto-save and restore form drafts (localStorage / sessionStorage / memory). Sensitive fields are excluded by default.
- [`@fillament/remote`](packages/remote) — async options, dependent lookups, and remote validation, with stale-result protection. No React Query or SWR dependency.
- [`@fillament/i18n`](packages/i18n) — localized labels, placeholders, and validation messages. Plain strings or `{ key, fallback }` messages, with interpolation and locale switching.
- [`@fillament/blueprints`](packages/blueprints) — starter form blueprints (login, signup, contact, surveys, commerce, onboarding). Payment fields are intentionally NOT raw card fields — wire a PCI-compliant provider (Stripe Elements, Paddle, Adyen).
- [`@fillament/redux`](packages/redux) — optional Redux bridge for teams that already use Redux. Defaults to one-way (form → store), `values-only` mode.

```ts
// Each module is imported independently — pay only for what you use.
import { createStoragePersistPlugin } from "@fillament/persist";
import { remoteOptions, remoteValidation } from "@fillament/remote";
import { createI18n } from "@fillament/i18n";
import { loginBlueprint } from "@fillament/blueprints/auth";
import { createReduxBridge } from "@fillament/redux";
```

See [docs/persist.md](docs/persist.md), [docs/remote.md](docs/remote.md), [docs/i18n.md](docs/i18n.md), [docs/blueprints.md](docs/blueprints.md), and [docs/redux.md](docs/redux.md) for details.

---

## Features

### 🎯 Type-safe field paths

Field names are inferred from your value type — typos and renames are caught at compile time.

```tsx
type User = { email: string; address: { city: string }; contacts: { email: string }[] };

<Field name="address.city" />          // ✅
<Field name="contacts.0.email" />       // ✅
<Field name="address.postcode" />       // ❌ compile error
```

### ⚡ Granular re-renders

Typing in one field re-renders only the components subscribed to that field — verified up to **500-field forms** in the [Performance story](apps/storybook/src/Performance.stories.tsx).

```tsx
function EmailField() {
  const f = useField("email");
  // re-renders only when "email" changes
}
```

### 🪄 Conditional fields with safe expression strings

```tsx
<Field name="accountType" as="Select" />

<Field
  name="company.name"
  visibleWhen="accountType === 'business'"
  unmountBehavior="preserve"   // | "clear" | "clear-and-unvalidate"
/>
```

Supports: `===`, `!==`, `==`, `!=`, `>`, `>=`, `<`, `<=`, `&&`, `||`, `!`, parentheses, booleans, strings, numbers, `null`, `undefined`. No `eval`.

### 🧬 Pluggable validation — pick one, mix several

```tsx
// Zod
useForm({ schema: zodAdapter(UserSchema) });

// JSON Schema (AJV)
useForm({ schema: jsonSchemaAdapter({ type: "object", required: ["email"], ... }) });

// Inline (Formik-style)
useForm({ validate: (values) => ({ email: !values.email && "Required" }) });

// Custom adapter
useForm({ schema: createValidationAdapter(async (values) => { ... }) });

// Compose: schema + inline at the same time
useForm({ schema: zodAdapter(UserSchema), validate: customRule });
```

### 📋 Field arrays with stable keys

```tsx
<FieldArray name="contacts">
  {(arr) => (
    <>
      {arr.items.map((c) => (
        <div key={c.key}>
          <Field name={c.path("name")} />
          <Field name={c.path("email")} />
          <button onClick={() => arr.remove(c.index)}>Remove</button>
        </div>
      ))}
      <button onClick={() => arr.append({ name: "", email: "" })}>+ Add</button>
    </>
  )}
</FieldArray>
```

Each row gets a stable key — field state (touched/errors/dirty) follows the row across reorder, insert, and remove.

### 📊 Spreadsheet-style array editing — `FieldArrayTable`

When you have a flat array of objects (contacts, line items, milestones, schedule rows), render it as a table where each column is a typed sub-field.

```tsx
import { FieldArrayTable } from "@fillament/react";

<FieldArrayTable<{ name: string; email: string; role: string; active?: boolean }>
  name="contacts"
  columns={[
    { name: "name", label: "Name", width: 200, required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "role", label: "Role", options: [
      { label: "Developer", value: "dev" },
      { label: "Designer", value: "designer" },
    ]},
    { name: "active", label: "Active", type: "checkbox", width: 70 },
  ]}
  newRow={() => ({ name: "", email: "", role: "dev", active: true })}
  addLabel="+ Add contact"
  minRows={1}
  maxRows={20}
/>
```

Built-in per-row move-up / move-down / remove actions with `aria-label`s, edge-disabled buttons, `minRows` / `maxRows` enforcement, optional custom `render` per cell. Also available declaratively through `<FieldsRenderer>` as `type: "table"`.

### 🤖 In-browser AI form fill — `@fillament/ai`

Let users describe what they want in plain language. An LLM running **entirely client-side** via [WebLLM](https://github.com/mlc-ai/web-llm) returns a JSON patch that maps onto your schema, and Fillament applies it — after the user previews the changes.

```tsx
import { FillamentAI } from "@fillament/ai";

<FillamentAI
  form={form}
  enabled
  model="Llama-3.2-3B-Instruct-q4f32_1-MLC"
  modelParams={{ temperature: 0.4, max_tokens: 512 }}
  schemaForAI={{ type: "zod", schema: UserSchema }}
  redact={["password"]}
  position="bottom-right"
/>
```

- **No server, no keys, no costs** — model runs in-browser via WebGPU
- **Schema-aware** — pass a JSON Schema, a Zod schema (auto-converted), or a `fields` description
- **Privacy-safe** — sensitive field values (`password`, `ssn`, `cvv`, `cardNumber`, `iban`, `dob`, …) are redacted **before** the model sees them; the default system prompt instructs the model not to fill them
- **Preview before apply** — users see the proposed `path → value` patch and click Apply
- **Configurable** — `enabled`, `model`, `temperature`, `top_p`, `max_tokens`, `seed`, `systemPrompt`, `position`, `includeCurrentValues`, custom `onProgress`
- **Tree-shakable** — `@mlc-ai/web-llm` is an optional peer dep loaded with dynamic `import()`; users who don't render `FillamentAI` pay zero bundle cost

### 🎨 Design-system component registry

```tsx
const ui = createFormUI({ TextInput, Select, Checkbox, DatePicker });

<FormProvider form={form} components={ui}>
  <Field name="email" as="TextInput" label="Email" />
  <Field name="birthDate" as="DatePicker" />
</FormProvider>
```

Or wrap a 3rd-party component with unusual prop names:

```tsx
const MUIAdapter = createComponentAdapter({
  component: MuiTextField,
  valueProp: "value",
  changeProp: "onChange",
  errorProp: "error",
  helperTextProp: "helperText",
  extractValue: (e) => e.target.value,
});
```

### 🗂️ JSON-driven dynamic forms

Load both the field layout AND the validation schema from JSON — perfect for CMS-driven forms or per-tenant configuration.

```tsx
const fields: FieldConfig[] = [
  { name: "fullName", type: "text", label: "Full name", required: true },
  { name: "accountType", type: "select", options: [
    { label: "Personal", value: "personal" },
    { label: "Business", value: "business" },
  ]},
  { name: "company", type: "group", visibleWhen: "accountType === 'business'",
    fields: [{ name: "name", label: "Company name", required: true }],
  },
  { name: "contacts", type: "array", addLabel: "+ Add contact",
    itemFields: [{ name: "name", label: "Name" }, { name: "email", label: "Email", type: "email" }],
  },
];

<FieldsRenderer fields={fields} />
```

### 🔍 Built-in DevTools (free)

```tsx
import { FillamentDevTools } from "@fillament/devtools";
<FillamentDevTools form={form} />
```

A floating panel with tabs for **Overview, Values, Fields, Errors, Validation timing, Render counts, Analytics events, and DevTools events**. No browser extension required.

### 🛡️ Privacy-safe analytics (free)

```tsx
import { createAnalyticsPlugin, customAnalyticsAdapter } from "@fillament/analytics";

const analytics = createAnalyticsPlugin({
  adapter: customAnalyticsAdapter((event) => send(event)),
});

useEffect(() => analytics.attach(form), [form]);
```

Default behavior is privacy-first:
- **Never sends field values** — only field names + event types
- Auto-redacts sensitive field names: `password`, `email`, `ssn`, `cardNumber`, `cvv`, `iban`, `dob`, `phone`, `address`, …
- Adapters for **Console / Segment / PostHog / custom**, plus a `redact: ["coupon", ...]` opt-in list

### 🔄 Drop-in Formik compatibility

Swap the import and your existing Formik code keeps working. `@fillament/formik-compat` implements `<Formik>`, `useFormik`, `<Field>`, `<ErrorMessage>`, `getFieldProps`, `getFieldMeta`, plus the full helper bag (`setFieldValue`, `setFieldTouched`, `setFieldError`, `setValues`, `setErrors`, `setTouched`, `resetForm`, `submitForm`, `validateForm`, `validateField`).

```diff
- import { Formik, useFormik } from "formik";
+ import { Formik, useFormik } from "@fillament/formik-compat";

  <Formik
    initialValues={{ email: "" }}
    validationSchema={Schema}  // Yup OR Zod — auto-detected
    onSubmit={save}
  >
    {(formik) => ( /* same render prop */ )}
  </Formik>
```

Migrate one form at a time. Unsupported props log development warnings instead of failing silently. When you're ready, drop the `-compat` wrapper and switch to the native API on your schedule.

### 🌐 SSR-ready

Works with Next.js (App + Pages Router), Remix, Vite, and plain React SPA. No `window` access during render, no `useLayoutEffect` warnings.

---

## Examples — interactive Storybook

```bash
pnpm install
pnpm storybook    # opens http://localhost:6006
```

| Story | What it shows |
| --- | --- |
| Basic Zod form | Minimal form + DevTools |
| Conditional fields | All three `unmountBehavior` modes |
| Field array | Reorder + remove with stable identity |
| **Array as table** | `FieldArrayTable` standalone + driven from JSON |
| Wizard | Multi-step form with hidden-step preservation |
| Server validation | Debounced async lookup with `AbortController` |
| Design-system adapter | Register UI components once |
| Component adapter | Wrap a 3rd-party input with unusual prop names |
| JSON Schema | Validation from a plain JSON Schema |
| Yup | Validation via `@fillament/yup` |
| Custom validation | Inline `validate` + full `ValidationAdapter` |
| JSON-driven fields | Whole form layout from a JSON config |
| Formik compat | Render-prop + `useFormik` migration demos |
| Analytics | Live event stream with redacted sensitive fields |
| DevTools | Floating inspector panel |
| **AI assist (WebLLM)** | Local LLM fills a form with redaction + preview |
| Performance | 10 / 100 / 500 field forms with per-field render counts |

---

## Development

```bash
pnpm install
pnpm build          # build all 9 packages
pnpm test           # 68/68 across 9 test suites
pnpm typecheck      # tsc on every package
pnpm storybook      # 16 interactive use-case stories at :6006
pnpm landing        # marketing landing page at :5173
```

## Contributing

We use [Changesets](https://github.com/changesets/changesets) for versioning and changelogs. When you make a code change that should ship in a release:

```bash
pnpm changeset           # pick packages + bump type + write a one-line summary
git push                 # open a PR
```

CI runs `typecheck`, `build`, `test`, and a Storybook + landing build on every PR. Merging to `main` opens a "Version Packages" PR; merging that publishes affected packages to npm and redeploys the landing + Storybook sites.

### Monorepo layout

```
fillament/
├── packages/
│   ├── core/              # framework-agnostic engine
│   ├── react/             # React bindings
│   ├── zod/               # Zod adapter
│   ├── yup/               # Yup adapter
│   ├── json-schema/       # JSON Schema adapter (AJV)
│   ├── analytics/         # free privacy-safe analytics
│   ├── devtools/          # free in-app inspector
│   ├── formik-compat/     # drop-in Formik compatibility layer
│   └── ai/                # in-browser AI fill assist (WebLLM)
├── apps/
│   ├── storybook/         # interactive use-case stories
│   └── landing/           # marketing site
└── tsconfig.base.json
```

---

## Roadmap

**v0.1 — shipped (this release)**
- Core engine + React bindings (`useForm`, `Form`, `Field`, `FieldArray`, `FieldArrayTable`, `FieldsRenderer`)
- Zod, Yup, and JSON Schema adapters
- Free DevTools + free privacy-safe analytics
- `@fillament/formik-compat` drop-in (render-prop `<Formik>`, `useFormik`, `<Field>`, `<ErrorMessage>`)
- `@fillament/ai` — in-browser AI form fill via WebLLM
- Landing page + Storybook with 16 use-case stories
- 68/68 tests across 9 packages

**v0.2 — next**
- `@fillament/codemod` Formik migration CLI
- Browser extension version of DevTools
- Cloud-LLM adapter for `@fillament/ai` (OpenAI / Anthropic / Ollama) — same UI, opt-in
- React Native + Vue bindings (exploratory)

**v1.0**
- Stable API + semver guarantees
- Full migration guide with mapping tables
- Performance benchmarks vs Formik / RHF

---

## License

MIT. DevTools and analytics are included — **never** gated behind a paid license.
