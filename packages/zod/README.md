# @fillament/zod

Zod validation adapter for [Fillament](https://github.com/headlessButSmart/fillament). Pass a Zod schema, get a Fillament `ValidationAdapter`.

```bash
pnpm add @fillament/zod zod
```

```ts
import { z } from "zod";
import { useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";

const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
  address: z.object({
    city: z.string().min(1),
    country: z.enum(["PT", "ES", "FR"]),
  }),
});

const form = useForm({
  schema: zodAdapter(UserSchema),
  defaultValues: { email: "", age: 18, address: { city: "", country: "PT" } },
});
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `zodAdapter(schema)` | factory | Returns a `ValidationAdapter` for the given Zod schema. |
| `isZodSchemaInput(value)` | helper | True if `value` looks like a Zod schema (has `safeParseAsync`). |
| `resolveSchema(value)` | helper | Auto-detect Zod or pre-built Fillament adapter. Returns `undefined` for anything else. |
| `z` | re-export | Re-exported from `zod` for convenience (`import { z } from "@fillament/zod"`). |

---

## `zodAdapter(schema)`

Build a Fillament adapter from any Zod schema with `safeParseAsync`. Works with `z.object`, `z.array`, `z.union`, `z.intersection`, transforms, refinements — anything Zod compiles.

Returns:

```ts
{
  type: "zod",
  validate: (values) => Promise<ValidationResult>,
  validateField: (name, value, values) => Promise<FieldValidationResult>,
}
```

### Error mapping

| Zod concept | Fillament concept |
| --- | --- |
| `path: ["address", "city"]` | `path: "address.city"` |
| `path: ["contacts", 0, "name"]` | `path: "contacts.0.name"` |
| `code` (`invalid_type`, `too_small`, `custom`, …) | `FormError.code` |
| `message` | `FormError.message` |

All errors are tagged `type: "schema"`, `source: "schema"`.

### Field-level validation

`validateField(name, value, values)` is optimized for top-level fields:

- If `schema.pick` is available and the field is a direct property of the root, it picks just that field and validates a tiny sub-object — much faster on big schemas.
- Otherwise it falls back to a full `safeParseAsync` and slices the issues for the requested path.

Either way, errors for nested children (e.g. validating `"address"` surfaces `"address.city is required"`) are included in the result.

---

## `resolveSchema(value)`

```ts
import { resolveSchema } from "@fillament/zod";

const adapter = resolveSchema(UserSchema);          // → ZodAdapter
const passthrough = resolveSchema(existingAdapter); // → existingAdapter (passed through)
const nothing = resolveSchema({ foo: "bar" });      // → undefined
```

Useful in libraries that accept either Zod schemas or Fillament adapters via a single prop — `formik-compat`'s `validationSchema` uses an equivalent pattern internally.

`isZodSchemaInput(value)` is the underlying detector — only checks for `safeParseAsync`. Pass it pre-`useMemo` arguments if you want a cheap "is this a Zod schema?" test.

---

## Type inference

`zodAdapter` accepts a schema with the structural shape `{ safeParseAsync(data): Promise<…> }`. The returned adapter is typed `ValidationAdapter<any>` — pair with `useForm<z.infer<typeof Schema>>` to get the typed field paths Fillament can check:

```ts
type UserValues = z.infer<typeof UserSchema>;
const form = useForm<UserValues>({ schema: zodAdapter(UserSchema) });

form.setValue("address.city", "Lisbon");   // ✅
form.setValue("address.zip", "1000-001");  // ❌ compile error — not in UserValues
```

---

## Composition with inline `validate`

`useForm` accepts both `schema` and `validate` at the same time. Use Zod for shape, inline for cross-field rules:

```ts
const Schema = z.object({
  password: z.string().min(8),
  passwordConfirm: z.string().min(8),
});

useForm({
  schema: zodAdapter(Schema),
  validate: (v) =>
    v.password === v.passwordConfirm
      ? {}
      : { passwordConfirm: "Passwords don't match" },
});
```

Inline and schema errors merge per-field — both appear in `field.errors`.

---

## Performance

- `safeParseAsync` is called per validation. Zod is fast, but for very large forms with `validateOn: ["change"]` you may want to debounce via `revalidateOn: ["blur"]` or `serverValidation.debounceMs`.
- Field-level validation falls back to a full parse when `pick` isn't applicable (transforms, refinements at the root). The slice happens after the parse — no double work.
- The adapter itself is stateless — safe to memoize at module scope.

---

## License

MIT © headlessButSmart
