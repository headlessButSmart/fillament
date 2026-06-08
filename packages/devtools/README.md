# @fillament/devtools

Free, in-app DevTools panel for [Fillament](https://github.com/headlessButSmart/fillament). A floating inspector with tabs for **Overview, Values, Fields, Errors, Validation timing, Render counts, Analytics events, and DevTools events**. No external service, no extension to install — just mount the component.

```bash
pnpm add @fillament/devtools
```

```tsx
import { FillamentDevTools } from "@fillament/devtools";

function App() {
  return (
    <>
      <UserForm />
      <FillamentDevTools form={form} />
    </>
  );
}
```

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `FillamentDevTools` | component | The floating inspector panel. |
| `registerFormForDevtools(form)` | function | Add a form to the global registry; returns an unregister function. |
| `listForms()` | function | Snapshot of all currently-registered forms. |
| `subscribeFormRegistry(listener)` | function | Subscribe to add / remove events; returns unsubscribe. |
| `FillamentDevToolsProps` | type | Component props. |

---

## `<FillamentDevTools>`

### Props
| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `form` | `FormApi<any>` | — | The form to inspect. If omitted, the panel shows a form picker populated from the global registry. |
| `initiallyOpen` | `boolean` | `false` | Open the panel on mount (handy in Storybook). |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Corner the floating button anchors to. |

### Tabs

| Tab | Shows |
| --- | --- |
| **Overview** | Form id, `isValid`, `isSubmitting`, `submitCount`, dirty + touched counts, validation in flight. |
| **Values** | Live `form.getValues()` pretty-printed JSON. Deep collapsible tree. |
| **Fields** | Per-field state: `touched`, `dirty`, `errors`, `visible`, `registered`, `validating`, `renderCount`. Sorted by render count by default — quickly find the chatty fields. |
| **Errors** | Field-level errors + form-level errors, grouped by path. Click an entry to scroll to the field in the Fields tab. |
| **Validation** | Timing of recent `validate()` / `validateField()` calls (start, end, duration) from the DevTools event stream. |
| **Performance** | Render-count history per field. |
| **Analytics** | Last 200 `AnalyticsEvent`s emitted by the form. Field names redacted to `fieldHash` when sensitive. |
| **DevTools** | Last 200 `DevtoolsEvent`s — form init, field register/unregister, change, blur, validate start/end, submit start/end, array operations. |

The panel reads from `form.subscribeFormState`, `form.subscribeAnalytics`, and `form.subscribeDevtools` — no polling, no extra wiring.

---

## Production usage

The DevTools panel is intended for development. Two patterns to keep it out of prod builds:

```tsx
// 1. Inline guard
{process.env.NODE_ENV !== "production" && <FillamentDevTools form={form} />}
```

```tsx
// 2. Dynamic import — splits the panel into its own chunk
const FillamentDevTools = lazy(() =>
  import("@fillament/devtools").then(m => ({ default: m.FillamentDevTools }))
);
{process.env.NODE_ENV !== "production" && (
  <Suspense fallback={null}><FillamentDevTools form={form} /></Suspense>
)}
```

If you do ship it to production, the panel is safe: it reads form state from the existing subscriptions and writes nothing back. Analytics field names are redacted to alias hashes, same as `@fillament/analytics`.

---

## Form discovery

The registry lets the panel inspect any form on the page without each form passing itself in:

```ts
import { registerFormForDevtools } from "@fillament/devtools";

// Register a form for inspection
const unregister = registerFormForDevtools(form);

// Later — e.g. unmount cleanup
unregister();
```

`<FillamentDevTools />` without a `form` prop shows a dropdown of currently-registered forms.

### Programmatic access
```ts
import { listForms, subscribeFormRegistry } from "@fillament/devtools";

const forms = listForms();                       // FormApi<any>[]
const unsub = subscribeFormRegistry(() => {
  console.log("registry changed", listForms().length);
});
```

`subscribeFormRegistry` plays well with `useSyncExternalStore` — the snapshot returned by `listForms()` is stable across reads.

---

## Styling

The panel injects its own scoped CSS on first mount (single-time, idempotent). It uses fixed positioning and a high `z-index`. If you need to nest it inside a constrained layout, wrap it in a portal of your own.

DOM markers for debugging / Playwright selectors: `data-fillament-devtools="root"`, `data-fillament-devtools-tab="<tab>"`, `data-fillament-devtools-field="<name>"`.

---

## License

MIT © headlessButSmart
