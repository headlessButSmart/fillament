# @fillament/json-schema

JSON Schema validation adapter for [Fillament](https://github.com/headlessButSmart/fillament). Backed by [Ajv](https://ajv.js.org) + [ajv-formats](https://github.com/ajv-validator/ajv-formats). Pass a JSON Schema, get a Fillament `ValidationAdapter` you can hand to `useForm`.

```bash
pnpm add @fillament/json-schema
```

```ts
import { useForm } from "@fillament/react";
import { jsonSchemaAdapter } from "@fillament/json-schema";

const schema = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", format: "email" },
    age:   { type: "integer", minimum: 18 },
    role:  { type: "string", enum: ["dev", "designer"] },
  },
};

const form = useForm({ schema: jsonSchemaAdapter(schema) });
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `jsonSchemaAdapter(schema, options?)` | factory | Returns a `ValidationAdapter` for the given JSON Schema. |
| `JsonSchema` | type | `Record<string, unknown>` — alias for the JSON-schema-shaped object. |
| `JsonSchemaAdapterOptions` | type | Adapter options. |
| `Ajv` | type | Re-export of Ajv's `Ajv` type for typing custom instances. |

---

## `jsonSchemaAdapter(schema, options?)`

### `JsonSchemaAdapterOptions`
| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `ajv` | `Ajv` | — | Pre-configured Ajv instance — pass one to share schemas, custom keywords, or formats across your app. |
| `ajvOptions` | `Ajv.Options` | `{ allErrors: true, strict: false }` | Options forwarded to Ajv when constructing a fresh instance. Your overrides merge on top. |
| `noFormats` | `boolean` | `false` | Skip auto-registering `ajv-formats`. Only relevant when you didn't pass your own `ajv`. |

Returns a `ValidationAdapter<TValues>` with `type: "json-schema"`. Pass it directly as `useForm({ schema: jsonSchemaAdapter(s) })`.

---

## How errors are mapped

| AJV concept | Fillament concept |
| --- | --- |
| `instancePath` (`/contacts/0/name`) | `path` (`contacts.0.name`) |
| `keyword` (`required`, `minLength`, `format`, …) | `FormError.code` |
| `message` (`must match format "email"`) | `FormError.message` |
| `params.missingProperty` for `required` errors | Appended to the path so the error lands on the missing field, not the parent. |
| Schema-path metadata | `FormError.meta.schemaPath` |

All errors are tagged `type: "schema"`, `source: "schema"`. `validate()` returns the full `ValidationResult`; field-level `validateField(name, value, values)` runs the full validate and slices the result, including any child errors (e.g. validating `"address"` surfaces `"address.city is required"`).

---

## Custom Ajv setup

Bring your own Ajv when you need keywords, formats, or shared compilation across schemas:

```ts
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { jsonSchemaAdapter } from "@fillament/json-schema";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addFormat("phone-pt", /^\+351\s?9\d{8}$/);
ajv.addKeyword({ keyword: "isUUID", validate: (_s: any, v: any) => typeof v === "string" });

const adapter = jsonSchemaAdapter(MySchema, { ajv });
```

When you pass your own `ajv`, `noFormats` is ignored — Fillament does not touch the instance.

---

## Conditional / advanced schemas

JSON Schema features that Ajv supports work out of the box:

- `oneOf` / `anyOf` / `allOf` — first matching schema wins for error reporting.
- `if` / `then` / `else` — conditional validation.
- `$ref` — local and remote references (configure Ajv accordingly).
- `dependencies`, `propertyNames`, `patternProperties`, `additionalProperties`.

For complex error UX (e.g. picking a specific `oneOf` branch's error to show), consume `FormError.meta.params` and `FormError.meta.schemaPath`.

---

## Type inference

`jsonSchemaAdapter` is generic over `TValues`:

```ts
type UserValues = {
  email: string;
  age: number;
  role: "dev" | "designer";
};

const form = useForm({
  schema: jsonSchemaAdapter<UserValues>(MySchema),
});
```

The adapter doesn't infer the type from the schema (JSON Schema → TS inference would require a heavy library). Pass `<UserValues>` explicitly when you want field-path checking — `form.setValue("email", …)` then gets the usual Fillament type safety.

---

## Performance

- Ajv compiles the schema once on `jsonSchemaAdapter(schema)`. Re-creating the adapter on every render compiles every render — memoize it:
  ```ts
  const adapter = useMemo(() => jsonSchemaAdapter(MySchema), []);
  ```
- `validate` and `validateField` share the compiled validator. Field-level validation is a slice of the full run.

---

## License

MIT © headlessButSmart
