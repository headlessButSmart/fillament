# `@fillament/test-data`

Deterministic, schema-derived test data for Fillament forms. **Optional**, dev-oriented. No faker dependency.

```bash
pnpm add -D @fillament/test-data
```

## Minimal example

```ts
import { fillFormWithTestData } from "@fillament/test-data";

fillFormWithTestData(form);               // realistic values for every field
fillFormWithTestData(form, { seed: 42 }); // reproducible
```

The shape comes from the form's validation adapter via core's `introspectForm()` — zod, yup, and json-schema adapters all support it; forms without an adapter fall back to type inference from `defaultValues`.

## DevTools button

```ts
import { enableTestDataDevtools } from "@fillament/test-data/devtools";

if (import.meta.env.DEV) {
  enableTestDataDevtools(); // 🎲 Fill test data button in <FillamentDevTools />
}
```

`@fillament/devtools` is an optional peer needed only by the `/devtools` entry.

## How values are picked

Per field, first match wins: your `overrides` → schema `const`/`enum`/`examples` → `format` (email, uri, uuid, date, date-time, time, ipv4) → property-name heuristics (`email`, `firstName`, `phone`, `*At` → epoch ms, `is*` → boolean, `price`, `age`, …) → typed fallback respecting `min`/`max`/`minLength`/`maxLength`/`minItems`/`maxItems`.

## Useful options

```ts
fillFormWithTestData(form, {
  seed: 7,                                  // reproducible
  overrides: { email: "qa@test.dev",        // pin paths (dot-paths ok)
               "contacts.0.name": "Pinned" },
  includeOptional: false,                   // minimal valid payload
  onlyEmpty: true,                          // don't clobber typed values
  arrayBounds: [2, 5],                      // items for unbounded arrays
});
```

`generateTestValues(jsonSchema, options)` is the pure generator behind it — use it for API fixtures without a form.

## Limits

Best effort, not a constraint solver: `pattern` regexes and cross-field rules (`passwordConfirm === password`) need `overrides`. The default `validate: true` runs the real schema after filling so mismatches surface immediately.

See the [package README](../packages/test-data/README.md) for the full reference.
