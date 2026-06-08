# @fillament/core

Framework-agnostic form engine for [Fillament](https://github.com/headlessButSmart/fillament). State, field registry, validation orchestration, path utilities, subscriptions, plugin extension point. Everything a React (or Vue, Solid, Svelte, vanilla) binding needs.

```bash
pnpm add @fillament/core
```

```ts
import { createForm } from "@fillament/core";

const form = createForm({
  defaultValues: { email: "", profile: { city: "" } },
});

form.setValue("email", "a@a.com");
form.setValue("profile.city", "Lisbon");
console.log(form.getState().values);
// { email: "a@a.com", profile: { city: "Lisbon" } }
```

For React, use [`@fillament/react`](https://github.com/headlessButSmart/fillament/tree/main/packages/react) — it wraps this engine with hooks and components.

---

## Exports

### Form engine
| Export | Kind | Purpose |
| --- | --- | --- |
| `createForm(options?)` | factory | Build a `FormApi<TValues>`. |
| `createFormStore` | alias | Same as `createForm`. Provided for ecosystem ergonomics. |
| `createFieldArray(form, name)` | factory | Build a `FieldArrayApi` for the array at `name`. |
| `createValidationAdapter(validate, options?)` | helper | Wrap a `(values) => ValidationResult` function into an adapter. |

### Path utilities
`getValueAtPath(obj, path)`, `setValueAtPath(obj, path, value)`, `deleteValueAtPath(obj, path)`, `hasPath(obj, path)`, `isEqual(a, b)`, `parsePath(path)`, `joinPath(segments)`, `isPathUnder(child, parent)`.

### Visibility
`compileVisibilityExpression(expr)`, `resolveVisibility(predicate, values)`, type `VisibilityPredicate<TValues>`.

### Emitters (used by bindings; rarely needed in user code)
`PathEmitter`, `SimpleEmitter`.

### Convenience helpers
`isDirty(form)`, `isTouched(form, path?)`, `validateForm(form)`, `validateField(form, name)`, `createField(form, name)`.

### Types
`FormApi`, `FormState`, `FormOptions`, `FormError`, `FieldState`, `FieldOptions`, `FieldArrayApi`, `FieldArrayItem`, `FieldRegistration`, `FieldPath`, `PathValue`, `FieldValue`, `ValidationAdapter`, `ValidationResult`, `FieldValidationResult`, `ValidateOn`, `RevalidateOn`, `FormMode`, `UnmountBehavior`, `InlineValidate`, `SubmitHandler`, `SubmitHelpers`, `ServerValidationOptions`, `AnalyticsEvent`, `AnalyticsEventType`, `DevtoolsEvent`, `FormEvent`, `Listener`, `Unsubscribe`, `FillamentPlugin`, `FillamentPluginContext`, `FillamentMessage`.

---

## `createForm(options?)`

### `FormOptions<TValues>`
| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` | auto (`"form_N"`) | Stable id surfaced in analytics + devtools. |
| `defaultValues` | `Partial<TValues>` | `{}` | Cloned via `structuredClone` on init. |
| `schema` | `ValidationAdapter \| unknown` | — | Pass `zodAdapter(...)`, `yupAdapter(...)`, `jsonSchemaAdapter(...)`, or your own adapter. Non-adapter values are ignored (no validation). |
| `validate` | `InlineValidate<TValues>` | — | Formik-style inline validator. Returns flat `{ "path": "msg" }`, a full `ValidationResult`, or nothing. Composes with `schema`. |
| `mode` | `"controlled" \| "uncontrolled" \| "hybrid"` | — | Informational; bindings honor it as they see fit. |
| `validateOn` | `Array<"change" \| "blur" \| "submit" \| "mount">` | `["blur", "submit"]` | When validation fires automatically. |
| `revalidateOn` | `Array<"change" \| "blur" \| "submit">` | `["change", "blur", "submit"]` | When validation re-runs after errors exist. |
| `preserveUnmountedFields` | `boolean` | `true` | When false, defaults `unmountBehavior` to `"clear"` per field. |
| `onSubmit` | `SubmitHandler<TValues>` | — | Called from `submit()` after validation passes. |
| `serverValidation` | `ServerValidationOptions<TValues>` | — | `{ endpoint?, validate?, debounceMs?, validateOn?, mapErrors? }`. Bindings layer the implementation on top. |
| `analytics` / `devtools` | `unknown` | — | Free-form slots for binding-specific config. |
| `plugins` | `ReadonlyArray<FillamentPlugin>` | — | Lifecycle observers — see below. |

---

## `FormApi<TValues>`

### State accessors
| Member | Signature | Notes |
| --- | --- | --- |
| `id` | `string` | Stable form id. |
| `options` | `FormOptions<TValues>` | The options the form was built with. Mutable — bindings may swap `onSubmit` between renders. |
| `getState()` | `() => FormState<TValues>` | Full live state object. |
| `formState` | getter | Same as `getState()`. |
| `getValues()` | `() => TValues` | Current values. |
| `getValue<T>(path)` | `(string) => T \| undefined` | Read a single path. |
| `getDefaultValues()` | `() => Partial<TValues>` | The defaults the form was seeded with. |
| `canSubmit` | getter (`boolean`) | `!isSubmitting && isValid`. |

### Mutations
| Member | Signature | Notes |
| --- | --- | --- |
| `setValue(path, value, opts?)` | `(string, unknown, { shouldValidate?, shouldTouch? }) => void` | No-op if value is unchanged. Fires `notifyPluginsValuesChange`. |
| `setFieldValue` | alias of `setValue` | Provided for ecosystem parity. |
| `setValues(partial, opts?)` | `(Partial<TValues>, { shouldValidate? }) => void` | Shallow merge into root. |
| `setFieldError(path, error)` | `(string, FormError \| string) => void` | Append a single error. |
| `setErrors(errors)` | `(Record<string, FormError[] \| FormError \| string>) => void` | Replace all field-level errors. |
| `clearErrors()` | `() => void` | Clear field + form errors. |
| `clearFieldErrors(path)` | `(string) => void` | Clear errors for one path. |
| `setFormErrors(errors)` | `(FormError[]) => void` | Replace form-level errors. |
| `setTouched(path, touched?)` | `(string, boolean) => void` | Default `true`. |
| `setFieldTouched` | alias | Same. |

### Field registry
| Member | Signature | Notes |
| --- | --- | --- |
| `registerField(name, options?, visiblePredicate?)` | `(string, FieldOptions, VisibilityPredicate?) => Unsubscribe` | Increments a ref count; safe to call multiple times for the same field. The returned unregister decrements and cleans up when count hits zero. |
| `unregisterField(name)` | `(string) => void` | Manual decrement; bindings normally use the returned unsubscribe. |
| `isFieldVisible(name)` | `(string) => boolean` | Current visibility (resolves `visiblePredicate`). |
| `getFieldState(name)` | `(string) => FieldState` | Snapshot for one field. |
| `incrementRenderCount(name)` | `(string) => void` | Bindings call this from each render to populate `FieldState.renderCount`. |

`FieldOptions`: `{ defaultValue?, validateOn?, unmountBehavior?, visible? }`.

`FieldState`: `{ name, touched, dirty, errors, visible, registered, validating, renderCount }`.

`UnmountBehavior`: `"preserve" | "clear" | "clear-and-unvalidate"`.

### Validation
| Member | Signature | Notes |
| --- | --- | --- |
| `validate()` | `() => Promise<ValidationResult<TValues>>` | Runs the combined `schema + inline validate`. Mutates state errors + `isValid`. Fires `onValidationError` on plugins when invalid. |
| `validateField(name)` | `(string) => Promise<FormError[]>` | Field-level validation. Uses `adapter.validateField` when available, else slices the full result. |

`ValidationResult<TValues>`: `{ valid: boolean; errors: Partial<Record<string, FormError[]>>; formErrors?: FormError[] }`.

`ValidationAdapter<TValues>`: `{ type: string; validate(values): Promise<ValidationResult>; validateField?(name, value, values): Promise<FieldValidationResult> }`.

`InlineValidate<TValues>` accepts the Formik-style flat map or a full `ValidationResult`. The engine normalizes either.

### Submission
| Member | Signature | Notes |
| --- | --- | --- |
| `submit()` | `() => Promise<void>` | No-op if already submitting. Validates → calls `options.onSubmit(values, helpers)` → updates state + emits analytics. Fires `onSubmitSuccess` / `onSubmitError` on plugins. |
| `reset(values?)` | `(Partial<TValues>?) => void` | Reset to passed values or the current defaults. Clears errors, touched, dirty, submit count. Fires `onReset` on plugins. |

`SubmitHelpers<TValues>`: `{ setFieldError, setErrors, resetForm, setSubmitting }`.

### Subscriptions
| Member | Signature | Notes |
| --- | --- | --- |
| `subscribe(path, listener)` | `(string, () => void) => Unsubscribe` | Subscribe to a single path (or `""` for any change). |
| `subscribeFormState(listener)` | `((state) => void) => Unsubscribe` | Subscribe to whole-state notifications. |
| `subscribeAnalytics(listener)` | `((event: AnalyticsEvent) => void) => Unsubscribe` | Receive analytics events. |
| `subscribeDevtools(listener)` | `((event: DevtoolsEvent) => void) => Unsubscribe` | Receive devtools events. |

### Analytics
| Member | Signature | Notes |
| --- | --- | --- |
| `emitAnalytics(partial)` | `(partial) => void` | Push a custom event into the analytics stream. `formId` + `timestamp` are filled in automatically. |

`AnalyticsEventType` enumerates: `form_started`, `form_submitted`, `form_submit_failed`, `form_abandoned`, `field_focused`, `field_blurred`, `field_changed`, `field_error`, `field_error_resolved`, `step_viewed`, `step_completed`, `server_validation_started/failed/succeeded`.

---

## `FormState<TValues>`

```ts
interface FormState<TValues> {
  values: TValues;
  defaultValues: Partial<TValues>;
  errors: Record<string, FormError[]>;
  formErrors: FormError[];
  touched: Record<string, boolean>;
  dirty: boolean;
  dirtyFields: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  submitCount: number;
  submittedAt?: number;
}
```

`FormError`: `{ message, type?, code?, path?, source?, meta? }` where `type` is one of `"required" | "schema" | "server" | "custom" | "unknown"` and `source` is `"client" | "server" | "schema"`.

---

## `FieldArrayApi<TItem>` (via `createFieldArray`)

```ts
const arr = createFieldArray<{ name: string }>(form, "contacts");

arr.items;                                          // FieldArrayItem<TItem>[]  — { key, index, value, path("name") }
arr.append({ name: "Ana" });
arr.prepend({ name: "Ben" });
arr.insert(2, { name: "Mei" });
arr.remove(1);
arr.move(0, 2);
arr.swap(0, 1);
arr.replace([{ name: "X" }]);
arr.update(2, { name: "Y" });
```

`FieldArrayItem<TItem>`: `{ key: string; index: number; value: TItem; path(name: string): string }`.

Keys are stable across reorder — same row keeps the same `key` even after `move`/`swap`. Use it as your React key.

---

## Visibility

Conditional fields can be driven by:

- A predicate: `(values) => values.accountType === "business"`.
- A safe expression string compiled by `compileVisibilityExpression("accountType === 'business'")`.

Supported operators (no `eval`): `===`, `!==`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `&&`, `||`, `!`, parentheses, dot-access (`address.city`), booleans, numbers, strings, `null`, `undefined`.

```ts
form.registerField("company.name", { unmountBehavior: "preserve" }, (values) => values.accountType === "business");
```

When a field becomes invisible, its `unmountBehavior` decides whether values + errors are dropped:

| Mode | Values | Errors |
| --- | :---: | :---: |
| `"preserve"` (default) | kept | kept |
| `"clear"` | dropped | kept |
| `"clear-and-unvalidate"` | dropped | dropped |

---

## Path utilities

Exported for bindings and tooling:

```ts
getValueAtPath({ a: { b: 1 } }, "a.b");                // 1
setValueAtPath({}, "a.b.c", 1);                        // { a: { b: { c: 1 } } }
deleteValueAtPath({ a: { b: 1 } }, "a.b");             // { a: {} }
hasPath({ a: 1 }, "a");                                // true
isEqual({ a: 1 }, { a: 1 });                           // true (deep)
parsePath("contacts.0.name");                          // ["contacts", "0", "name"]
joinPath(["contacts", "0", "name"]);                   // "contacts.0.name"
isPathUnder("address.city", "address");                // true
```

All path utilities are immutable — they never mutate their inputs.

---

## Plugin extension point

Optional modules like [`@fillament/persist`](https://www.npmjs.com/package/@fillament/persist) and [`@fillament/redux`](https://www.npmjs.com/package/@fillament/redux) extend Fillament through `FillamentPlugin`. Pass plugins via `options.plugins`:

```ts
import { createForm, type FillamentPlugin } from "@fillament/core";

const logger: FillamentPlugin<{ name: string }> = {
  name: "logger",
  onInit:           (ctx) => console.log("[form ready]", ctx.formId),
  onValuesChange:   (v)   => console.log("[values]", v),
  onSubmitSuccess:  (v)   => console.log("[submitted]", v),
  onSubmitError:    (e)   => console.warn("[submit failed]", e),
  onReset:          ()    => console.log("[reset]"),
  onValidationError:(e)   => console.warn("[validation]", e),
};

createForm({ defaultValues: { name: "" }, plugins: [logger] });
```

### `FillamentPlugin<TValues>`

| Hook | Signature | Notes |
| --- | --- | --- |
| `name` | `string?` | Identifier surfaced in error logs. |
| `onInit` | `(ctx) => void \| (() => void)` | Fires once after the form is built. Return a cleanup function to be called on dispose. |
| `onValuesChange` | `(values, ctx) => void` | Fires after every `setValue` / `setValues`. |
| `onSubmitSuccess` | `(values, ctx) => void` | Fires after `submit()` resolves cleanly. |
| `onSubmitError` | `(error, ctx) => void` | Fires when the `onSubmit` handler throws. |
| `onReset` | `(ctx) => void` | Fires after `form.reset()`. |
| `onValidationError` | `(errors, ctx) => void` | Fires after `validate()` returns invalid. |

`FillamentPluginContext<TValues>`: `{ form: FormApi<TValues>; formId: string }`.

Plugin throws are caught and logged to `console.warn` — they never break the form. When using `@fillament/react`, the host `useForm` hook tears down plugin cleanups on unmount automatically via the internal `__disposePlugins()` hook.

### `FillamentMessage`

A small additive type so optional modules (notably `@fillament/i18n`) can speak a shared message shape:

```ts
type FillamentMessage =
  | string
  | { key: string; values?: Record<string, unknown>; fallback?: string };
```

Core itself does not perform resolution — bring an i18n adapter or resolve inline.

---

## Custom validation adapters

`createValidationAdapter` lets you wrap a plain function in the adapter interface:

```ts
import { createValidationAdapter } from "@fillament/core";

const adapter = createValidationAdapter(async (values) => {
  if (await isTaken(values.username)) {
    return { valid: false, errors: { username: [{ message: "Taken", code: "taken" }] } };
  }
  return { valid: true, errors: {} };
}, { type: "custom" });
```

Pass it as `useForm({ schema: adapter })`. Provide a custom `validateField` in the options if you can validate one field at a time more cheaply.

---

## Optional modules

The base engine is small and uncoupled. Add only what you need:

- [`@fillament/persist`](https://www.npmjs.com/package/@fillament/persist) — draft auto-save and restore.
- [`@fillament/remote`](https://www.npmjs.com/package/@fillament/remote) — async options, dependent lookups, remote validation.
- [`@fillament/i18n`](https://www.npmjs.com/package/@fillament/i18n) — localized labels and messages.
- [`@fillament/blueprints`](https://www.npmjs.com/package/@fillament/blueprints) — starter form blueprints.
- [`@fillament/redux`](https://www.npmjs.com/package/@fillament/redux) — optional Redux bridge.

## License

MIT © headlessButSmart
