# @fillament/react

React bindings for [Fillament](https://github.com/headlessButSmart/fillament). Hooks (`useForm`, `useField`, `useFieldArray`, `useWatch`, `useFormState`), components (`Form`, `Field`, `FieldArray`, `FieldArrayTable`, `FieldsRenderer`), context, and an adapter helper for plugging in your design system.

```bash
pnpm add @fillament/react @fillament/core
```

```tsx
import { z } from "zod";
import { Form, Field, useForm } from "@fillament/react";
import { zodAdapter } from "@fillament/zod";

const Schema = z.object({ email: z.string().email(), name: z.string().min(1) });

export function UserForm() {
  const form = useForm({
    schema: zodAdapter(Schema),
    defaultValues: { email: "", name: "" },
  });
  return (
    <Form form={form} onSubmit={async (v) => console.log(v)}>
      <Field name="email" label="Email" type="email" required />
      <Field name="name" label="Name" required />
      <button type="submit">Save</button>
    </Form>
  );
}
```

---

## Exports

### Hooks
| Export | Purpose |
| --- | --- |
| `useForm(options?)` | Create a form (one instance per component lifetime). |
| `useFormState(form)` | Subscribe to full `FormState` — re-renders on any state change. |
| `useFormStateSelector(form, selector, isEqual?)` | Subscribe to a selected slice; re-renders only when that slice changes. |
| `useFormValues(form)` | Subscribe to current `values` only. |
| `useWatch(name, form?)` | Subscribe to one field path; re-renders only when it changes. |
| `useField(name, options?, formOverride?)` | Headless field hook — registers, subscribes, returns render props. |
| `useFieldState(name, formOverride?)` | Subscribe to a single field's `FieldState`. |
| `useFieldArray(name)` | Get a `FieldArrayApi` for a dynamic array (uses form from context). |
| `useFormContext()` | The form from context. Throws if no `<Form>` / `<FormProvider>` above. |
| `useFormContextOrNull()` | Same, but returns `null` instead of throwing. |
| `useComponents()` | Read the component registry passed via `<Form components={…}>`. |

### Components
| Export | Purpose |
| --- | --- |
| `Form` | `<form>` element + `FormContext`. Wires `onSubmit`, runs `form.submit()` on native submit. |
| `FormProvider` | Bare context provider — no `<form>` element. Use when you render the form element yourself. |
| `Field` | Default field renderer with built-in label / input / textarea / select / checkbox / radio. |
| `FieldArray` | Render-prop wrapper around `useFieldArray`. |
| `FieldArrayTable` | Spreadsheet-style table renderer for an array of objects. |
| `FieldsRenderer` | Drive a whole form from a JSON / data-driven `FieldConfig[]`. |

### Context helpers
| Export | Purpose |
| --- | --- |
| `FormContext` | The raw React context. |
| `createFormUI(components)` | Identity helper for typing a `ComponentRegistry`. |
| `createComponentAdapter(options)` | Wrap any external component (MUI, Mantine, AntD, …) into a Fillament-aware field. |

### Re-exported from `@fillament/core`
`FormApi`, `FormState`, `FormError`, `FormOptions`, `FieldState`, `SubmitHandler`, `ValidationAdapter`, `ValidationResult`, `AnalyticsEvent`, `DevtoolsEvent`, `VisibilityPredicate`, `FieldArrayApi`, `UnmountBehavior`.

---

## `useForm(options?)`

Creates the form instance and binds React lifecycle to it. The instance is stable across renders (re-uses a ref). On unmount, plugin cleanups registered via `FillamentPlugin.onInit` are torn down automatically.

```ts
const form = useForm<UserValues>({
  schema: zodAdapter(UserSchema),
  defaultValues: { email: "", name: "" },
  validateOn: ["blur", "submit"],
  revalidateOn: ["change"],
  onSubmit: async (values, helpers) => { /* … */ },
  plugins: [persistPlugin, reduxBridge],
});
```

Accepts every `FormOptions<TValues>` from `@fillament/core`: `id`, `schema`, `validate`, `defaultValues`, `mode`, `validateOn`, `revalidateOn`, `preserveUnmountedFields`, `onSubmit`, `serverValidation`, `analytics`, `devtools`, `plugins`. The `onSubmit` reference is re-synced on every render so swapping it doesn't recreate the form.

Returns `FormApi<TValues>` — see the [core README](https://github.com/headlessButSmart/fillament/tree/main/packages/core#readme) for the full surface (`setValue`, `setValues`, `setFieldError`, `validate`, `submit`, `reset`, `subscribe`, …).

---

## `useField(name, options?, formOverride?)`

The headless building block. Wire any input to it.

```tsx
function MyEmailField() {
  const field = useField<string>("email", { required: true });
  return (
    <label>
      Email
      <input
        value={(field.value ?? "") as string}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        aria-invalid={field.invalid || undefined}
      />
      {field.error?.message}
    </label>
  );
}
```

### `UseFieldOptions`
| Option | Type | Notes |
| --- | --- | --- |
| `defaultValue` | `unknown` | Seed value if the field isn't already in form state. |
| `validateOn` | `ValidateOn[]` | Override the form-level setting for this field. |
| `visibleWhen` | `VisibilityPredicate \| string` | Conditional visibility — function or safe expression string. |
| `unmountBehavior` | `UnmountBehavior` | `"preserve" \| "clear" \| "clear-and-unvalidate"` when the field unmounts. |
| `disabled` | `boolean` | Forwarded to `inputProps.disabled`. |
| `readOnly` | `boolean` | Currently informational. |
| `required` | `boolean` | Forwarded to `inputProps.required` and used for the `" *"` marker in `Field`. |

### `FieldRenderProps<TValue>`
| Member | Type | Notes |
| --- | --- | --- |
| `name` | `string` | Field path. |
| `value` | `TValue` | Current value (subscribed). |
| `error` | `FormError \| undefined` | First error, for convenience. |
| `errors` | `FormError[]` | All errors. |
| `touched / dirty / valid / invalid / visible` | `boolean` | Live state. |
| `disabled / required` | `boolean` | From options. |
| `onChange(eventOrValue)` | `(unknown) => void` | Accepts a DOM event (auto-extracts `.target.value`, checkbox `.checked`, numeric inputs) or a raw value. Does not mark touched. |
| `onBlur()` | `() => void` | Marks touched and fires blur analytics. |
| `onFocus()` | `() => void` | Fires `field_focused` analytics. |
| `setValue(value)` | `(TValue) => void` | Mark touched + revalidate. |
| `setTouched(touched?)` | `(boolean) => void` | Default `true`. |
| `validate()` | `() => Promise<FormError[]>` | Run field validation now. |
| `inputProps` | object | Ready-to-spread props: `name`, `value`, `onChange`, `onBlur`, `onFocus`, plus aria + disabled / required attributes when relevant. |

`useFieldState(name)` returns the raw `FieldState` — `{ name, touched, dirty, errors, visible, registered, validating, renderCount }` — without the input handlers.

---

## `Field`

Default renderer for the most common control types. Pass `children` as a render prop to fully customize, or `as` to swap the underlying control.

```tsx
<Field name="email" label="Email" type="email" required />

<Field name="role" label="Role" type="radio"
       options={[{ label: "Dev", value: "dev" }, { label: "Designer", value: "design" }]} />

<Field name="newsletter" label="Subscribe" type="checkbox" />

<Field name="notes" label="Notes" type="textarea" placeholder="Tell us more" />

<Field name="country" label="Country" options={[{ label: "PT", value: "PT" }]} />

<Field name="custom">
  {(field) => <MyFancyInput value={field.value} onChange={field.onChange} />}
</Field>

<Field name="company" label="Company" as="MUITextField" />  // resolved via context registry
```

### `FieldProps`
Extends `UseFieldOptions` plus:

| Prop | Type | Notes |
| --- | --- | --- |
| `name` | `string` | **required**. Dot-path within the form values. |
| `label` | `ReactNode` | Optional. Shown above the input (or inline for checkboxes). |
| `description` | `ReactNode` | Optional. Helper text below the input. |
| `placeholder` | `string` | Forwarded to text inputs and used as the empty-option label in selects. |
| `as` | `ComponentType \| string` | Override the default control. Strings are looked up in the `<Form components={…}>` registry. |
| `children` | `(field: FieldRenderProps) => ReactNode` | Render prop for full custom rendering. |
| `type` | `string` | Native input type: `text / email / password / number / tel / url / date / checkbox / radio / textarea`. |
| `options` | `Array<{ label, value }>` | When set without `type="radio"`, renders a `<select>`. With `type="radio"`, renders a radio group. |
| `visibleWhen` | predicate or expression | Mount/unmount the field by condition. |
| `unmountBehavior` | `UnmountBehavior` | Same as `UseFieldOptions.unmountBehavior`. |

DOM markers Field emits for styling: `data-fillament-field=<name>`, `data-fillament-type`, `data-fillament-invalid`, `data-fillament-label`, `data-fillament-description`, `data-fillament-error`. Use them in your CSS to skin every field uniformly.

---

## `Form`

Renders a `<form>` element, wires `onSubmit`, and provides `FormContext` to descendants.

| Prop | Type | Notes |
| --- | --- | --- |
| `form` | `FormApi<TValues>` | **required**. |
| `onSubmit` | `SubmitHandler<TValues>` | Optional. If provided, replaces `form.options.onSubmit` for this render. |
| `children` | `ReactNode` | Fields, buttons, etc. |
| `components` | `ComponentRegistry` | Map of name → component, resolved by `<Field as="…">` and `<FieldsRenderer>`. |
| `noValidate` | `boolean` | Defaults to `true` (disables native browser validation in favor of Fillament's). |
| `className`, `id`, `aria-label` | `string` | Passed through to the `<form>` element. |

Native submit (`<button type="submit">` or Enter in an input) calls `form.submit()`.

### `FormProvider`

Same as `<Form>` minus the `<form>` element — useful when you render the form tag yourself (multi-section forms, custom layout shells).

```tsx
<FormProvider form={form}>
  <SidebarNav />
  <form onSubmit={(e) => { e.preventDefault(); form.submit(); }}>
    {/* … */}
  </form>
</FormProvider>
```

---

## `FieldArray` & `useFieldArray`

Render a dynamic list with stable per-row keys.

```tsx
<FieldArray<{ name: string; email: string }> name="contacts">
  {(arr) => (
    <>
      {arr.items.map((c) => (
        <div key={c.key}>
          <Field name={c.path("name")} label="Name" />
          <Field name={c.path("email")} label="Email" />
          <button onClick={() => arr.remove(c.index)}>Remove</button>
        </div>
      ))}
      <button onClick={() => arr.append({ name: "", email: "" })}>+ Add</button>
    </>
  )}
</FieldArray>
```

`FieldArrayApi<TItem>` from `@fillament/core` exposes `items`, `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `replace`, `update`. `c.key` is stable across reorder so React keys remain consistent; `c.path("name")` builds the absolute field path for `<Field>`.

`useFieldArray(name)` is the hook form when you don't want a render prop.

---

## `FieldArrayTable`

Spreadsheet-style editor for arrays of objects.

```tsx
<FieldArrayTable<{ name: string; email: string; role: string; active: boolean }>
  name="contacts"
  columns={[
    { name: "name", label: "Name", width: 200, required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "role", label: "Role", options: [
      { label: "Developer", value: "dev" },
      { label: "Designer", value: "design" },
    ] },
    { name: "active", label: "Active", type: "checkbox", width: 70 },
  ]}
  newRow={() => ({ name: "", email: "", role: "dev", active: true })}
  minRows={1}
  maxRows={20}
  addLabel="+ Add contact"
/>
```

### `FieldArrayTableProps<TItem>`
| Prop | Type | Notes |
| --- | --- | --- |
| `name` | `string` | Field path of the array. |
| `columns` | `TableColumn[]` | Per-column descriptors. |
| `newRow` | `() => TItem` | Factory for blank rows. Defaults to `{}` if omitted. |
| `addLabel` | `string` | Default `"+ Add row"`. |
| `removeLabel` | `string` | Default `"Remove"`. |
| `showRowActions` | `boolean` | Show move-up / move-down / remove. Default `true`. |
| `showHeader` | `boolean` | Render `<thead>` row. Default `true`. |
| `caption` / `footer` | `ReactNode` | Optional pre/post content. |
| `hideAdd` | `boolean` | Hide the "+ Add" button. |
| `minRows` / `maxRows` | `number` | Disable Remove / Add at limits. |
| `className` | `string` | Forwarded to the `<table>`. |

### `TableColumn`
Per-column: `name`, `label`, `type`, `as`, `options`, `visibleWhen` (predicate or expression), `unmountBehavior`, `required`, `disabled`, `readOnly`, `placeholder`, `width`, `fieldProps`, `render` (cell renderer for full custom).

---

## `FieldsRenderer`

Drive an entire form from data — `FieldConfig[]` is JSON-safe.

```tsx
<FieldsRenderer
  fields={[
    { name: "fullName", type: "text", required: true },
    { name: "accountType", type: "select", options: [
      { label: "Personal", value: "personal" },
      { label: "Business", value: "business" },
    ]},
    { name: "company", type: "group",
      visibleWhen: "accountType === 'business'",
      fields: [
        { name: "name", required: true },
        { name: "taxId" },
      ],
    },
    { name: "contacts", type: "array", itemFields: [
      { name: "name" },
      { name: "email", type: "email" },
    ]},
    { name: "lineItems", type: "table", columns: [
      { name: "sku", label: "SKU" },
      { name: "qty", label: "Qty", type: "number" },
    ]},
  ]}
/>
```

### `FieldConfig`
| Field | Notes |
| --- | --- |
| `name`, `type`, `label`, `description`, `placeholder` | Same semantics as `<Field>`. |
| `as` | String registry name OR direct `ComponentType`. |
| `visibleWhen` | Predicate or safe expression string. |
| `unmountBehavior` | `"preserve" \| "clear" \| "clear-and-unvalidate"`. |
| `required`, `disabled`, `readOnly`, `defaultValue` | Forwarded. |
| `options` | For `select` / `radio`. |
| `itemFields` | For `type: "array"` — config per item. |
| `columns` | For `type: "table"` — `TableColumn[]`. |
| `addLabel`, `removeLabel`, `showRowActions`, `minRows`, `maxRows` | For arrays / tables. |
| `fields` | For `type: "group"` — nested config. |
| `props` | Extra props forwarded to the rendered control. |

`FieldsRenderer` auto-infers `type` from `columns` (→ `"table"`), `options` (→ `"select"`), `itemFields` (→ `"array"`), `fields` (→ `"group"`).

`wrap?(field, rendered) => ReactNode` lets you wrap every rendered field — useful for grid layouts.

---

## Context + design-system adapter

```tsx
import { createComponentAdapter, Form } from "@fillament/react";
import { TextField } from "@mui/material";

const MUIText = createComponentAdapter({
  component: TextField,
  valueProp: "value",
  changeProp: "onChange",
  blurProp: "onBlur",
  errorProp: "error",
  helperTextProp: "helperText",
  extractValue: (e: any) => e?.target?.value ?? e,
});

<Form form={form} components={{ MUIText }}>
  <Field name="email" as="MUIText" label="Email" />
</Form>
```

`createComponentAdapter(opts)`:

| Option | Notes |
| --- | --- |
| `component` | The external component to wrap. |
| `valueProp` / `changeProp` / `blurProp` | Prop names to map field props onto. Defaults: `value`, `onChange`, `onBlur`. |
| `errorProp` | If set, receives the field's invalid boolean. |
| `helperTextProp` | If set, receives the field's first error message. |
| `extractValue(event)` | Convert the component's onChange payload back to a raw value. |
| `mapProps(field, extra)` | Full takeover — return the exact props object to forward. |

The adapter returns a component that consumes `{ field, …rest }`. `<Field as="…">` wires `field` for you via the registry.

---

## Subscriptions — performance notes

- `useWatch(name)` re-renders only when that specific path changes.
- `useField(name)` re-renders on value or field-state changes (touched, dirty, errors, visible, validating, render counter).
- `useFormState(form)` re-renders on **any** form state change — use sparingly.
- `useFormStateSelector(form, selector, isEqual?)` returns a memoized slice — best for "is the form valid?" / "submit count" / single-flag selectors.
- `useFormValues(form)` subscribes to all values.

For a 100-field form, prefer per-field `useField` over `useFormState` reads; only fields whose values change re-render.

---

## License

MIT © headlessButSmart
