# @fillament/test-data

Deterministic test data for [Fillament](https://github.com/headlessButSmart/fillament) forms. One call fills any form with realistic values derived from its **validation schema** — emails that look like emails, ages inside the allowed range, enum values picked from the actual options. Ships with an optional one-click **DevTools button**.

```bash
pnpm add -D @fillament/test-data
```

No faker dependency — a tiny built-in vocabulary keeps the package small. Tree-shakeable, side-effect-free. The `/devtools` entry is separate so test environments never pull React.

---

## Quick start

### Fill a form (tests, stories, scripts)

```ts
import { fillFormWithTestData } from "@fillament/test-data";

fillFormWithTestData(form);              // random but valid-shaped data
fillFormWithTestData(form, { seed: 42 }); // identical output on every run
```

The schema comes from the form's validation adapter via `introspectForm()` — zod, yup, and json-schema adapters are all supported, with a fallback to inferring types from `defaultValues`.

### One-click button in DevTools

```ts
// app entry — dev builds only
import { enableTestDataDevtools } from "@fillament/test-data/devtools";

if (import.meta.env.DEV) {
  enableTestDataDevtools();
}
```

A **🎲 Fill test data** button appears in the [`<FillamentDevTools />`](https://github.com/headlessButSmart/fillament/tree/main/packages/devtools) toolbar and fills whichever form the panel is attached to. `@fillament/devtools` is an optional peer — only the `/devtools` entry needs it.

### Generate values without a form

```ts
import { generateTestValues } from "@fillament/test-data";

const user = generateTestValues(jsonSchema, { seed: 1 });
// → { email: "ada.lovelace23@example.org", age: 47, status: "ACTIVE", ... }
```

---

## How values are chosen

Per schema node, first match wins:

1. **Override** — you pinned the path in `overrides`.
2. **`const` / `enum` / `examples`** — picked from the schema's own values.
3. **`format`** — `email`, `uri`, `uuid`, `date`, `date-time`, `time`, `ipv4` get matching fakes.
4. **Property-name heuristics** — see below.
5. **Type defaults** — respecting `minimum`/`maximum`, `minLength`/`maxLength`, `minItems`/`maxItems`.

### Name heuristics

When the schema doesn't pin a format, the property name does the talking:

| Name pattern | Generated value |
| --- | --- |
| `is*` / `has*` / `should*` | boolean |
| `*At` (`createdAt`, `expiresAt`) | Unix epoch **milliseconds** within the last year |
| `email` | `grace.hopper7@example.org` |
| `firstName` / `lastName` / `name` / `userName` | name parts / full names |
| `phone` / `mobile` / `tel` | `+12025551234`-style |
| `url` / `website` / `link` | `https://…` |
| `uuid` / `guid` | v4-shaped UUID |
| `street` / `address`, `city`, `country`, `zip` / `postal` | address parts |
| `company` / `organization` | company names |
| `birth*` / `dob` | ISO date |
| `description` / `comment` / `message` / `notes` / `bio` | short sentence |
| `title` / `subject` / `label` | 2–4 words |
| `price` / `amount` / `total` | 2-decimal number |
| `quantity` / `count` | 1–20 |
| `age` | 18–80 |

(The `*At` → epoch-ms and `is*` → boolean rules follow the Rierino data conventions.)

---

## Exports

### `@fillament/test-data`

| Export | Kind | Purpose |
| --- | --- | --- |
| `fillFormWithTestData(form, options?)` | function | Introspect → generate → `setValues`. Returns the applied values. |
| `generateTestValues(schema, options?)` | function | Pure generator: JSON Schema in, values out. |
| `createRng(seed?)` | factory | The seeded PRNG (mulberry32), exported for custom generators. |
| `generateFromName(name, rng)` | helper | Run the name heuristics directly. |
| `fakeEmail`, `fakeFullName`, `fakeFirstName`, `fakeLastName`, `fakePhone`, `fakeUrl`, `fakeUuid`, `fakeSentence`, `fakeEpochMs`, `fakeIsoDate`, `fakeIsoDateTime` | helpers | Individual fakes, all `(rng) => value`. |
| `GenerateOptions`, `FillOptions`, `JsonSchemaLike`, `Rng` | types | |

### `@fillament/test-data/devtools`

| Export | Kind | Purpose |
| --- | --- | --- |
| `enableTestDataDevtools(options?)` | function | Registers the toolbar button. Returns an unregister function. |
| `TestDataDevtoolsOptions` | type | `FillOptions` + `label`. |

---

## Options

### `GenerateOptions` (accepted everywhere)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `seed` | `number` | random | Same seed → same output. Use in tests and bug reproductions. |
| `overrides` | `Record<string, value \| (rng) => value>` | — | Pin dot-paths: `{ "email": "qa@test.dev", "contacts.0.name": "Pinned" }`. |
| `includeOptional` | `boolean` | `true` | Also generate non-`required` properties. `false` = minimal valid payload. |
| `arrayBounds` | `[min, max]` | `[1, 3]` | Item count for arrays without `minItems`/`maxItems`. |

### `FillOptions` (extends `GenerateOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `onlyEmpty` | `boolean` | `false` | Keep anything the user already typed; only fill `undefined`/`null`/`""` fields. |
| `validate` | `boolean` | `true` | Run form validation after filling, so the generated data is immediately checked against the real schema. |

---

## Recipes

### Reproducible integration tests

```ts
import { createForm } from "@fillament/core";
import { zodAdapter } from "@fillament/zod";
import { fillFormWithTestData } from "@fillament/test-data";

it("submits a generated signup", async () => {
  const form = createForm({ schema: zodAdapter(SignupSchema), onSubmit });
  fillFormWithTestData(form, { seed: 7, overrides: { email: "fixed@test.dev" } });
  await form.submit();
  expect(onSubmit).toHaveBeenCalled();
});
```

### Minimal vs. full payloads

```ts
// Only required fields — the smallest payload that should pass validation:
fillFormWithTestData(form, { includeOptional: false });

// Everything, but don't clobber what the tester already typed:
fillFormWithTestData(form, { onlyEmpty: true });
```

### Custom DevTools button

```ts
enableTestDataDevtools({
  label: "🧪 Demo data",
  seed: 1,
  overrides: { "user.email": "demo@yourco.dev" },
});
```

### Storybook stories

```ts
export const Filled: Story = {
  play: async () => {
    fillFormWithTestData(form, { seed: 42 });
  },
};
```

---

## Determinism notes

- All generators draw from a single seeded PRNG, so a seed fixes the entire value tree.
- `*At` timestamps are quantized to the hour, so a fixed seed yields identical values across calls in the same session (they stay "recent" rather than anchored to a constant date).
- Generation is **best effort**, not a constraint solver: `pattern` regexes and cross-field rules (e.g. `passwordConfirm === password`) aren't satisfied automatically — pin those with `overrides`. The default `validate: true` surfaces any mismatch immediately.

---

## License

MIT © headlessButSmart
