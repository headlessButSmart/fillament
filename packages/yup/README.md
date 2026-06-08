# @fillament/yup

Yup validation adapter for [Fillament](https://github.com/headlessButSmart/fillament). Pass a Yup schema, get a Fillament `ValidationAdapter`.

```bash
pnpm add @fillament/yup yup
```

```ts
import * as yup from "yup";
import { useForm } from "@fillament/react";
import { yupAdapter } from "@fillament/yup";

const UserSchema = yup.object({
  email: yup.string().email().required(),
  age: yup.number().min(18).required(),
  address: yup.object({
    city: yup.string().required(),
    country: yup.string().oneOf(["PT", "ES", "FR"]).required(),
  }),
});

const form = useForm({ schema: yupAdapter(UserSchema) });
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `yupAdapter(schema)` | factory | Returns a `ValidationAdapter` for the given Yup schema. |
| `YupSchema` | type | The minimal structural shape we depend on (`validate`, optional `validateAt`). |

---

## `yupAdapter(schema)`

Build a Fillament adapter from any Yup schema with `validate(value, options)`. Works with `yup.object`, `yup.array`, refinements, `.when()` conditionals, custom tests — anything Yup compiles.

Returns:

```ts
{
  type: "yup",
  validate: (values) => Promise<ValidationResult>,
  validateField: (name, value, values) => Promise<FieldValidationResult>,
}
```

### Error mapping

| Yup concept | Fillament concept |
| --- | --- |
| `path: "address.city"` | `path: "address.city"` |
| `path: "contacts[0].name"` | `path: "contacts.0.name"` (bracket → dot normalized) |
| `type: "required" \| "min" \| "email" \| …` | `FormError.code` |
| `message` | `FormError.message` |
| Aggregated `inner` errors (`abortEarly: false`) | Each becomes a separate `FormError`; root-level errors land in `formErrors`. |

All errors are tagged `type: "schema"`, `source: "schema"`. The adapter always runs Yup with `abortEarly: false` so you get every error in one pass.

### Field-level validation

`validateField(name, value, values)` uses `schema.validateAt` when available — Yup compiles a slice of the schema at the requested path and only validates that subtree. Falls back to a full validate + path-filter when `validateAt` isn't supported. Either way, errors for nested children (validating `"address"` surfaces `"address.city is required"`) are included.

---

## Type inference

`yupAdapter` is generic over `TValues` — pass it explicitly to keep field-path typing tight:

```ts
type UserValues = yup.InferType<typeof UserSchema>;
const form = useForm<UserValues>({ schema: yupAdapter(UserSchema) });

form.setValue("address.city", "Lisbon");    // ✅
form.setValue("address.zip", "1000-001");   // ❌ compile error
```

---

## Composition with inline `validate`

Use Yup for shape, inline for cross-field rules:

```ts
const Schema = yup.object({
  password: yup.string().min(8).required(),
  passwordConfirm: yup.string().min(8).required(),
});

useForm({
  schema: yupAdapter(Schema),
  validate: (v) =>
    v.password === v.passwordConfirm
      ? {}
      : { passwordConfirm: "Passwords don't match" },
});
```

The two error streams merge per-field — both appear in `field.errors`.

---

## Casting vs. validating

Yup distinguishes `cast` (coerce types) from `validate` (check rules). This adapter only validates — values are not coerced before being passed to your form. If you want coercion (e.g. `"42"` → `42`), use Yup's `cast()` on submit, or pair with Fillament's per-field `extractValue` patterns.

---

## Performance

- The adapter is stateless; safe to memoize at module scope.
- `validateAt` is preferred for field-level validation — it's noticeably faster than a full validate + slice on large schemas.
- For very large forms with `validateOn: ["change"]`, debounce via `revalidateOn: ["blur"]` or use `serverValidation.debounceMs`.

---

## License

MIT © headlessButSmart
