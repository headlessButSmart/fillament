# `@fillament/redux`

Mirror Fillament form state into an existing Redux store. **Optional.** Nothing else in Fillament depends on Redux.

```bash
pnpm add @fillament/redux
```

The package does not declare `redux` as a hard dependency — only your app does. We type against a minimal `StoreLike` contract so the bridge is structurally compatible with the real Redux `Store`, Redux Toolkit's store, or anything else that exposes `getState` / `dispatch` / `subscribe`.

## Minimal example

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

The bridge dispatches `{ type: "fillament/checkoutForm/SET", payload: { values } }` on every value change.

## Modes

- `"values-only"` (default) — dispatch only the current values map. Cheap, no render-y state.
- `"values-and-errors"` — also mirror per-field errors.
- `"full-state"` — mirror the entire `FormState` (touched, dirty, isSubmitting, etc.). Useful for full-state-driven UIs.

## Debouncing

For very large forms, debounce dispatches:

```ts
createReduxBridge({ store, slice: "x", debounceMs: 100 });
```

## Hydrating from the store

```ts
createReduxBridge({
  store,
  slice: "x",
  hydrate: true,
  selectValues: (state) => state.x.values,
});
```

Hydration happens **once** on mount. After that, the bridge writes one-way (form → store) to avoid the classic infinite loop where a store-driven update would re-enter the form, which would re-dispatch, which would re-update the store, etc.

## With Redux Toolkit

```ts
import { createFillamentSlice } from "@fillament/redux";

const checkoutSlice = createFillamentSlice("checkout");

const store = configureStore({
  reducer: { [checkoutSlice.name]: checkoutSlice.reducer },
});
```

## When NOT to use this

If you're not already on Redux, **don't add it just for forms.** Use `@fillament/persist` for draft restore, the core subscription APIs (`subscribeFormState`) for analytics, and component-local state for the rest.
