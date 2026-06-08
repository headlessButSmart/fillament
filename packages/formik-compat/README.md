# @fillament/formik-compat

Drop-in [Formik](https://formik.org) compatibility layer for [Fillament](https://github.com/headlessButSmart/fillament). Implements `<Formik>`, `useFormik`, `<Field>`, `<ErrorMessage>`, `useFormikContext`, plus the full helper bag. Migrate one form at a time without rewriting JSX.

```bash
pnpm add @fillament/formik-compat
```

```diff
- import { Formik, useFormik, Field, ErrorMessage } from "formik";
+ import { Formik, useFormik, Field, ErrorMessage } from "@fillament/formik-compat";
```

Your existing code keeps working. When ready, swap `<Formik>` for `<Form form={useForm(...)}>` on each form on your own schedule.

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `useFormik(config)` | hook | Drop-in `useFormik`. Returns a `FormikBag` matching Formik's API. |
| `Formik` | component | Render-prop / children component matching `<Formik>`. |
| `FormikCompat` | component | Alias for `Formik`. |
| `Field` | component | Formik-compatible `<Field>` — `<Field name="email" type="email" />`. |
| `ErrorMessage` | component | `<ErrorMessage name="email" />` — renders the field's first error. |
| `useFormikContext()` | hook | Read the bag from a Formik context. |
| `resolveValidationSchema(schema)` | helper | Detect Yup / Zod / Fillament adapter and return a Fillament adapter. Used internally — exported for advanced use. |
| `flattenFormikErrors(errors)` | helper | Flatten Formik's nested errors object to dot-path strings. |
| `FormikConfig`, `FormikBag`, `FormikSubmitHelpers`, `FormikCompatProps`, `FormikFieldProps`, `ErrorMessageProps`, `FieldProps`, `FormikErrors`, `FormikValidate` | types | Full type surface. |

---

## `<Formik>` / `useFormik`

```tsx
<Formik
  initialValues={{ email: "", name: "" }}
  validationSchema={YupOrZodSchema}      // or a pre-built Fillament adapter
  validate={(v) => v.email ? {} : { email: "Required" }}
  validateOnBlur
  validateOnChange={false}
  validateOnMount={false}
  enableReinitialize={false}
  onSubmit={async (values, helpers) => {
    await save(values);
    helpers.setSubmitting(false);
  }}
>
  {(formik) => (
    <form onSubmit={formik.handleSubmit}>
      <Field name="email" type="email" />
      <ErrorMessage name="email" />
      <button type="submit" disabled={formik.isSubmitting}>Save</button>
    </form>
  )}
</Formik>
```

### `FormikConfig<TValues>`
| Option | Type | Notes |
| --- | --- | --- |
| `initialValues` | `TValues` | Same as Formik. |
| `validationSchema` | Yup / Zod / Fillament adapter | Auto-detected. |
| `validate` | `FormikValidate<TValues>` | Optional inline validator. Returns flat `{ "path": "msg" }` map or nested. Composes with `validationSchema`. |
| `validateOnBlur` / `validateOnChange` / `validateOnMount` | `boolean` | Forwarded to the underlying `validateOn` config. |
| `enableReinitialize` | `boolean` | When `true`, `initialValues` changes re-seed the form. |
| `onSubmit(values, helpers)` | `(TValues, FormikSubmitHelpers<TValues>) => void \| Promise<void>` | Same as Formik. |
| `innerRef` | `unknown` | Logs a development warning (unsupported). |

### `FormikBag<TValues>`
All Formik-bag members: `values`, `errors`, `touched`, `isSubmitting`, `isValidating`, `isValid`, `dirty`, `submitCount`, `status` (informational), `handleSubmit`, `handleChange`, `handleBlur`, `handleReset`, `setFieldValue`, `setFieldTouched`, `setFieldError`, `setValues`, `setErrors`, `setTouched`, `setStatus`, `setSubmitting`, `submitForm`, `validateForm`, `validateField`, `resetForm`, `getFieldProps`, `getFieldMeta`.

`errors` is the **flat** Formik shape (`{ "user.name": "Required" }`) — `flattenFormikErrors` is what Fillament uses internally to translate.

### `FormikSubmitHelpers<TValues>`
| Method | Signature | Notes |
| --- | --- | --- |
| `setSubmitting(isSubmitting)` | `(boolean) => void` | Pair with `await save(...)`; the bridge doesn't auto-flip it. |
| `setErrors(errors)` | `(FormikErrors) => void` | Replace the error map (server validation pattern). |
| `setFieldError(field, message)` | `(string, string \| undefined) => void` | Set a single field's error. `undefined` clears. |
| `setFieldValue(field, value, shouldValidate?)` | — | Defaults `shouldValidate: true`. |
| `setFieldTouched(field, isTouched?, shouldValidate?)` | — | Defaults `true` for both. |
| `setStatus(status)` | `(unknown) => void` | Status is a free-form slot for app-level state (success message, banners). |
| `resetForm(next?)` | `(Partial<{ values, errors, touched }>) => void` | Same as Formik. |

---

## `<Field>` (Formik-flavor)

```tsx
<Field name="email" type="email" />
<Field name="role" as="select">
  <option value="dev">Developer</option>
  <option value="design">Designer</option>
</Field>
<Field name="bio" as="textarea" />
<Field name="custom">
  {(props) => <MyInput {...props.field} />}
</Field>
```

`FieldProps`:
| Prop | Type | Notes |
| --- | --- | --- |
| `name` | `string` | **required** dot-path. |
| `type` | `string` | Native input type. |
| `as` | `ComponentType \| "select" \| "textarea"` | Override the rendered tag. |
| `children` | `(props) => ReactNode` | Render-prop access to `{ field, meta, helpers }`. |
| `validate` | `(value) => string \| undefined` | Per-field inline validator. |

---

## `<ErrorMessage>`

```tsx
<ErrorMessage name="email" />
<ErrorMessage name="email" component="div" className="error" />
<ErrorMessage name="email">{(msg) => <Hint>{msg}</Hint>}</ErrorMessage>
```

`ErrorMessageProps`:
| Prop | Notes |
| --- | --- |
| `name` | Field path. |
| `component` | `string \| ComponentType` — wrap the message in this. Defaults to a `<div>`. |
| `children` | Render prop — receives the first error message. |
| `className` | Forwarded. |

Renders `null` when the field is valid or untouched.

---

## `useFormikContext`

Read the bag from any descendant of `<Formik>`:

```tsx
function SubmitButton() {
  const formik = useFormikContext();
  return <button type="submit" disabled={formik.isSubmitting || !formik.isValid}>Save</button>;
}
```

Throws when used outside `<Formik>` — matches Formik's behavior.

---

## Schema auto-detection

`validationSchema` accepts:

| Input | Detection | Adapter used |
| --- | --- | --- |
| Yup schema | `__isYupSchema__` true, or `.describe` is a function | Built-in Yup adapter (no `@fillament/yup` dep needed). |
| Zod schema | `safeParseAsync` is a function | Built-in Zod adapter. |
| Fillament adapter | `{ type: string, validate: function }` | Passed through unchanged. |
| Anything else | — | Development warning, validation skipped. |

Detection order matters: Yup schemas also satisfy the generic `{ type, validate }` shape, so Yup is checked first. `resolveValidationSchema(schema)` is exported if you want to run the detection yourself.

---

## Error flattening

Formik allows nested errors `{ user: { name: "Required" } }`. Fillament uses flat dot-paths. `flattenFormikErrors` does the translation:

```ts
flattenFormikErrors({ user: { name: "Required" }, contacts: [{ email: "Invalid" }] });
// → { "user.name": "Required", "contacts.0.email": "Invalid" }
```

---

## Things that intentionally differ

| Behavior | Formik | This package |
| --- | --- | --- |
| `<FastField>` | optimization for big forms | Use the native `@fillament/react` `<Field>` + `useField` — Fillament is already per-field-subscription, no fast-path needed. |
| `connect()` HOC | wraps a class component | Logs a dev warning if invoked. Use `useFormikContext` instead. |
| `innerRef` | exposes the formik instance | Logs a dev warning; the bag exposes everything you need imperatively. |
| Unknown `validationSchema` | Formik throws | Logs a dev warning, skips validation. |
| `submitForm()` | resolves even when validation fails | Same — but Fillament emits `form_submit_failed` analytics. |

---

## Migration path

1. Replace the imports (`formik` → `@fillament/formik-compat`).
2. Run your tests — most apps need no other changes.
3. When you're ready, swap one form to native `@fillament/react`:
   ```diff
   - import { useFormik, Formik } from "@fillament/formik-compat";
   + import { useForm, Form, Field } from "@fillament/react";
   ```
4. Repeat per form. Both packages coexist in the same app.

---

## License

MIT © headlessButSmart
