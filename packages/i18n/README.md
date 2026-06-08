# @fillament/i18n

Localized labels, placeholders, descriptions, and validation messages for [Fillament](https://github.com/headlessButSmart/fillament). A thin adapter layer over message resolution — not a full i18n framework, intentionally.

```bash
pnpm add @fillament/i18n
```

Designed to plug into `FillamentMessage` from `@fillament/core` so any field accepting `label`, `placeholder`, `description`, or error messages can resolve through your active locale.

---

## Quick start

```ts
import { createI18n } from "@fillament/i18n";

const i18n = createI18n({
  locale: "pt",
  fallbackLocale: "en",
  messages: {
    en: { "user.email.label": "Email", "user.email.required": "Email is required" },
    pt: { "user.email.label": "Email", "user.email.required": "O email é obrigatório" },
  },
});

i18n.t({ key: "user.email.label", fallback: "Email" });             // → "Email"
i18n.t({ key: "field.min", values: { n: 8 }, fallback: "Min {n}" }); // → "Min 8"
i18n.t("Hello world");                                              // → "Hello world"  (plain strings pass through)
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `createI18n(options)` | factory | Returns an observable `I18nAdapter` with `t`, `setLocale`, `setMessages`, `subscribe`. |
| `createMessageResolver(i18n)` | factory | Thin wrapper around an `I18nAdapter` exposing a single `resolve()` method. |
| `resolveMessage(message, options?)` | helper | One-shot resolution — no locale switching needed. |
| `defaultInterpolate(template, values)` | helper | The built-in `{name}` interpolator, exported so you can compose it. |
| `FillamentMessage` | type | Re-exported from `@fillament/core` for convenience. |
| `I18nAdapter` | type | Return type of `createI18n`. |
| `MessageResolver` | type | Return type of `createMessageResolver`. |
| `MessageDict` | type | `Record<string, string>` — a flat message dictionary for one locale. |
| `CreateI18nOptions` | type | Options accepted by `createI18n`. |

---

## `FillamentMessage`

The shape Fillament-aware components accept:

```ts
type FillamentMessage =
  | string                                       // plain string — returned as-is
  | { key: string; values?: Record<string, unknown>; fallback?: string };
```

You can pass either form anywhere a label, placeholder, description, or error message is expected.

---

## `createI18n(options)`

### `CreateI18nOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `locale` | `string` | **required** | The initial active locale. |
| `messages` | `MessageDict \| Record<string, MessageDict>` | — | Either a flat dict for the current locale, or a nested map keyed by locale (`{ en: {…}, pt: {…} }`). The factory auto-detects which form you passed. |
| `fallbackLocale` | `string` | — | Looked up when a key is missing in the active locale. |
| `resolver` | `(key: string, locale: string) => string \| undefined` | — | Custom resolver — overrides the built-in dictionary lookup. Return `undefined` to fall through to the dictionary / fallback / `fallback` / key. |
| `interpolate` | `(template: string, values: Record<string, unknown>) => string` | `defaultInterpolate` | Override the `{name}` token replacement. |

### Returned `I18nAdapter`

| Member | Signature | Notes |
| --- | --- | --- |
| `locale` | `string` (getter) | The active locale. |
| `t(message)` | `(FillamentMessage) => string` | Resolve a message. Plain strings pass through. |
| `setLocale(locale)` | `(string) => void` | Switch locale. No-op if unchanged. Notifies subscribers. |
| `setMessages(locale, dict)` | `(string, MessageDict) => void` | Merge a dict into the given locale (existing keys overwritten, others kept). Notifies. |
| `subscribe(listener)` | `(() => void) => () => void` | Subscribe to locale or dict changes; returns unsubscribe. |

### Resolution order

For a `{ key, values, fallback }` message:

1. If `resolver` is set, call it. Non-`undefined` wins.
2. Look up the key in the active locale's dict.
3. If still missing and `fallbackLocale` is set and different, look it up there.
4. Use `fallback` if provided.
5. Return the `key` itself as the last resort.

`values` (when present) is then passed through `interpolate`.

---

## Interpolation

Default tokens are `{name}` placeholders:

```ts
i18n.t({
  key: "field.minLength",
  values: { min: 8 },
  fallback: "Must be at least {min} characters",
});
// → "Must be at least 8 characters"
```

Replace the syntax by passing your own `interpolate`:

```ts
const i18n = createI18n({
  locale: "en",
  interpolate: (template, values) =>
    template.replace(/%\{(\w+)\}/g, (_m, k) => (values[k] == null ? "" : String(values[k]))),
});
```

---

## `createMessageResolver(i18n)`

When you want to pass a smaller object to code that should only resolve messages (not switch locales):

```ts
import { createMessageResolver } from "@fillament/i18n";
const resolver = createMessageResolver(i18n);
resolver.resolve({ key: "x", fallback: "X" });
```

`MessageResolver` is:

```ts
interface MessageResolver {
  resolve(message: FillamentMessage): string;
}
```

---

## `resolveMessage(message, options?)`

One-shot helper for codebases that don't need locale switching at runtime — e.g. a build-time-rendered dictionary, or a unit test asserting fallback behavior.

```ts
import { resolveMessage } from "@fillament/i18n";

resolveMessage({ key: "field.min", values: { n: 3 }, fallback: "Min {n}" });
// → "Min 3"

resolveMessage(
  { key: "user.email" },
  { messages: { "user.email": "Email" } }
);
// → "Email"
```

Options:

| Option | Type | Notes |
| --- | --- | --- |
| `messages` | `MessageDict` | Flat dict to look up in. |
| `interpolate` | same as above | Override the token syntax. |

---

## Wiring into Fillament fields

`<Field>` accepts plain strings (existing behavior) — wrap them in your i18n call:

```tsx
<Field
  name="email"
  type="email"
  label={i18n.t({ key: "user.email.label", fallback: "Email" })}
  placeholder={i18n.t({ key: "user.email.placeholder", fallback: "you@company.com" })}
/>
```

For schema-driven forms, store the `{ key, fallback }` objects directly in your blueprint or JSON config and resolve them in your renderer.

---

## Locale switching pattern

```tsx
import { useSyncExternalStore } from "react";

function useI18nLocale(i18n: I18nAdapter) {
  return useSyncExternalStore(
    (cb) => i18n.subscribe(cb),
    () => i18n.locale,
    () => i18n.locale
  );
}

function LocaleSwitcher({ i18n }) {
  useI18nLocale(i18n);  // re-render on change
  return (
    <select value={i18n.locale} onChange={(e) => i18n.setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="pt">Português</option>
    </select>
  );
}
```

---

## Optional adapters

Not bundled — they'd each pull a peer dependency. Implement them in your own project against the `I18nAdapter` shape if you need parity:

- `createIntlAdapter(intl)` — wrap a `formatjs` `IntlShape`.
- `createI18nextAdapter(i18next)` — pass `i18next.t` through `resolver`.
- `createLinguiAdapter(i18n)` — wrap a Lingui `i18n` instance.

All three are one-screen wrappers around the existing `resolver` option.

---

## Testing

```ts
import { describe, it, expect } from "vitest";
import { createI18n } from "@fillament/i18n";

it("falls back to fallback string when key missing", () => {
  const i18n = createI18n({ locale: "en", messages: {} });
  expect(i18n.t({ key: "missing", fallback: "Default" })).toBe("Default");
});
```

---

## License

MIT © headlessButSmart
