# @fillament/redux

Optional Redux bridge for [Fillament](https://github.com/headlessButSmart/fillament). Mirror form values, errors, or full state into an existing Redux (or Redux Toolkit) store. **Redux is an optional peer dependency** — nothing else in Fillament needs it.

```bash
pnpm add @fillament/redux
# you bring your own:
pnpm add redux @reduxjs/toolkit
```

If you're not already on Redux, **don't add it just for forms**. Use [`@fillament/persist`](https://www.npmjs.com/package/@fillament/persist) for draft restore, the core `subscribeFormState` for analytics, and component state for the rest.

---

## Quick start

```ts
import { configureStore } from "@reduxjs/toolkit";
import { useForm } from "@fillament/react";
import { createReduxBridge, fillamentReducer } from "@fillament/redux";

const store = configureStore({
  reducer: { fillament: fillamentReducer },
});

const form = useForm({
  schema,
  plugins: [
    createReduxBridge({
      store,
      slice: "checkoutForm",
      mode: "values-only",
    }),
  ],
});
```

The bridge dispatches `{ type: "fillament/checkoutForm/SET", slice: "checkoutForm", payload: { values } }` on every value change.

---

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `createReduxBridge(options)` | factory | Returns a `FillamentPlugin` that mirrors form state into the store. |
| `fillamentReducer(state, action)` | reducer | A slice-aware reducer that handles `fillament/*` actions. Drop into `configureStore`. |
| `createFillamentSlice(slice)` | factory | Per-slice helper — returns `{ name, actionType, reducer, setAction }` for RTK-style consumers. |
| `StoreLike<TState>` | type | Minimal store contract — `getState` / `dispatch` / `subscribe`. Structurally compatible with the real Redux `Store`. |
| `ReduxBridgeMode` | type | `"values-only" \| "values-and-errors" \| "full-state"`. |
| `ReduxBridgeOptions<TValues, TState>` | type | Options accepted by `createReduxBridge`. |
| `FillamentReducerState` | type | The shape `fillamentReducer` produces. |
| `FormState` | type | Re-exported from `@fillament/core`. |

---

## `createReduxBridge(options)`

### `ReduxBridgeOptions<TValues, TState>`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `store` | `StoreLike<TState>` | **required** | Any object satisfying the `StoreLike` contract — the real Redux `Store`, RTK's store, or a structurally compatible one. |
| `slice` | `string` | **required** | Slice name. Becomes the action's `slice` field and is used to address the reducer state. |
| `mode` | `ReduxBridgeMode` | `"values-only"` | What to mirror. See below. |
| `actionType` | `string` | `` `fillament/${slice}/SET` `` | Override if you need to namespace differently. |
| `debounceMs` | `number` | `0` | Coalesce dispatches. Recommended for very large forms. |
| `hydrate` | `boolean` | `false` | When `true`, read `state[slice].values` on mount and `setValues` into the form. |
| `selectValues` | `(state: TState) => Partial<TValues> \| undefined` | — | Custom selector for hydration. Defaults to `state[slice].values`. |

### Modes

`ReduxBridgeMode` chooses what's dispatched:

- `"values-only"` (default) — `{ values }`. Cheap, no render-y state.
- `"values-and-errors"` — `{ values, errors }`. Useful for showing form errors elsewhere in the UI.
- `"full-state"` — `{ state }`, the entire `FormState<TValues>` (values, errors, touched, dirty, isSubmitting, …). Use for full-state-driven UIs.

### Returned plugin

A standard `FillamentPlugin` with `onInit`, `onValuesChange`, `onSubmitSuccess`, `onReset`. The bridge does **not** subscribe to the store after the initial hydration — sync is one-way (form → store) to avoid the classic infinite loop where store updates re-enter the form, which re-dispatches, etc.

If you genuinely need two-way sync, wire a separate subscription in your component with explicit conflict resolution.

---

## `StoreLike<TState>`

```ts
interface StoreLike<TState = any> {
  getState(): TState;
  dispatch(action: { type: string; [k: string]: unknown }): unknown;
  subscribe(listener: () => void): () => void;
}
```

The real Redux `Store` and Redux Toolkit's store both satisfy this trivially. No casts required.

---

## Action shape

Dispatched actions look like:

```ts
{
  type: "fillament/<slice>/SET",
  slice: "<slice>",
  payload: { values?, errors?, state? }   // depends on `mode`
}
```

You can listen for them in your own reducers or middleware — they're plain Redux FSAs.

---

## `fillamentReducer`

A pre-built reducer that handles every `fillament/*/SET` action and stores the payload under `state[slice]`:

```ts
import { configureStore } from "@reduxjs/toolkit";
import { fillamentReducer } from "@fillament/redux";

const store = configureStore({
  reducer: { fillament: fillamentReducer },
});

// After typing into a form wired with slice "checkoutForm":
store.getState();
// { fillament: { checkoutForm: { values: { … } } } }
```

`fillamentReducer` ignores actions whose type doesn't start with `fillament/` and actions missing a `slice` field, so it composes safely alongside your own reducers.

### `FillamentReducerState`

```ts
interface FillamentReducerState {
  [slice: string]: { values?: any; errors?: any; state?: any };
}
```

---

## `createFillamentSlice(slice)`

A per-slice helper for RTK consumers who'd rather wire each form's slice individually:

```ts
import { configureStore } from "@reduxjs/toolkit";
import { createFillamentSlice, createReduxBridge } from "@fillament/redux";

const checkoutSlice = createFillamentSlice("checkout");

const store = configureStore({
  reducer: {
    [checkoutSlice.name]: checkoutSlice.reducer,
  },
});

useForm({
  schema,
  plugins: [createReduxBridge({ store, slice: "checkout" })],
});
```

Returns:

```ts
interface FillamentSlice {
  name: string;          // the slice name you passed in
  actionType: string;    // `fillament/<slice>/SET`
  reducer: (state, action) => MirroredPayload;
  setAction(payload): { type, slice, payload };  // create the action manually
}
```

Use `slice.setAction({ values })` if you want to dispatch a synthetic update from elsewhere (e.g. tests, "load saved order" buttons that pre-populate a form via the store).

---

## Hydration pattern

```ts
createReduxBridge({
  store,
  slice: "checkoutForm",
  hydrate: true,
  selectValues: (state) => state.checkoutForm?.savedDraft?.values,
});
```

Hydration runs once during `onInit`. If `selectValues` returns `undefined` or an empty object, hydration is skipped silently.

---

## Avoiding infinite loops

The bridge is one-way after hydration. If you build a separate subscription pushing store changes back into the form (e.g. for "load this saved order"), gate it so the same dispatch path doesn't re-fire:

```ts
let suppress = false;
store.subscribe(() => {
  if (suppress) return;
  const next = selectValues(store.getState());
  if (shouldApply(next)) {
    suppress = true;
    form.setValues(next);
    setTimeout(() => { suppress = false; }, 0);
  }
});
```

The simpler pattern is: only push store→form on explicit user actions (a "Load saved order" button), not on every store change.

---

## Debouncing

For large forms, batch dispatches:

```ts
createReduxBridge({ store, slice: "x", debounceMs: 100 });
```

The bridge cancels and replaces pending dispatches when newer ones arrive, so you only ever pay for the latest.

---

## Testing

The bridge is exercised against a tiny `StoreLike` in the package's own tests — useful as a template:

```ts
function makeStore() {
  let state = {};
  const listeners = new Set<() => void>();
  const actions: any[] = [];
  return {
    actions,
    getState: () => state,
    dispatch: (action) => {
      actions.push(action);
      state = fillamentReducer(state, action);
      listeners.forEach((l) => l());
      return action;
    },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}
```

Then assert on `store.actions` after driving the form.

---

## License

MIT © headlessButSmart
