// Optional Redux bridge. The "redux" package is NOT required to import or build
// this module — we type against a minimal Store-like interface so consumers can
// pass any compatible store (Redux Toolkit, Zustand-with-Redux-adapter, etc.).
import type { FillamentPlugin, FillamentPluginContext, FormState } from "@fillament/core";

export type ReduxBridgeMode = "values-only" | "values-and-errors" | "full-state";

// Minimal Redux Store-like contract. Casting to `import("redux").Store` works
// because this is structurally compatible with the real Redux Store.
export interface StoreLike<TState = any> {
  getState(): TState;
  dispatch(action: { type: string; [k: string]: unknown }): unknown;
  subscribe(listener: () => void): () => void;
}

export interface ReduxBridgeOptions<TValues = unknown, TState = any> {
  store: StoreLike<TState>;
  slice: string;
  mode?: ReduxBridgeMode;
  /** Action type used to push form state into the store. Defaults to `fillament/<slice>/SET`. */
  actionType?: string;
  /** When set, debounce dispatches by this many ms. */
  debounceMs?: number;
  /** Hydrate the form from `state[slice]` on init. */
  hydrate?: boolean;
  /** Pull values from the redux state when hydrating. Defaults to `state[slice].values`. */
  selectValues?: (state: TState) => Partial<TValues> | undefined;
}

interface MirroredPayload<TValues> {
  values?: TValues;
  errors?: FormState<TValues>["errors"];
  state?: FormState<TValues>;
}

function projectPayload<TValues>(
  formState: FormState<TValues>,
  mode: ReduxBridgeMode
): MirroredPayload<TValues> {
  if (mode === "values-only") return { values: formState.values };
  if (mode === "values-and-errors") return { values: formState.values, errors: formState.errors };
  return { state: formState };
}

/**
 * Create a Fillament plugin that mirrors form state into a Redux-like store.
 * Defaults to `values-only` to avoid pushing render-y state (touched/dirty) on
 * every keystroke. Use `debounceMs` for very large forms.
 *
 * To avoid infinite loops: the bridge does not call `setValues` in response to
 * store updates after the initial hydration. If you need bi-directional sync,
 * wire a separate subscription with explicit conflict resolution.
 */
export function createReduxBridge<TValues = unknown, TState = any>(
  options: ReduxBridgeOptions<TValues, TState>
): FillamentPlugin<TValues> {
  const mode: ReduxBridgeMode = options.mode ?? "values-only";
  const actionType = options.actionType ?? `fillament/${options.slice}/SET`;
  const debounceMs = options.debounceMs ?? 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dispatched = 0;

  function dispatch(formState: FormState<TValues>): void {
    options.store.dispatch({
      type: actionType,
      slice: options.slice,
      payload: projectPayload(formState, mode),
    });
    dispatched += 1;
  }

  function schedule(ctx: FillamentPluginContext<TValues>): void {
    const fs = ctx.form.getState();
    if (debounceMs <= 0) {
      dispatch(fs);
      return;
    }
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      dispatch(ctx.form.getState());
    }, debounceMs);
  }

  return {
    name: "@fillament/redux",
    onInit(ctx) {
      if (options.hydrate) {
        try {
          const state = options.store.getState();
          const sliceState: any = state ? (state as any)[options.slice] : undefined;
          const values = options.selectValues
            ? options.selectValues(state)
            : (sliceState?.values as Partial<TValues> | undefined);
          if (values && typeof values === "object" && Object.keys(values).length > 0) {
            ctx.form.setValues(values);
          }
        } catch {
          // Hydration is best-effort.
        }
      }
      // Initial mirror so consumers see form state immediately.
      dispatch(ctx.form.getState());
      return () => {
        if (timer != null) {
          clearTimeout(timer);
          timer = null;
        }
      };
    },
    onValuesChange(_v, ctx) {
      schedule(ctx);
    },
    onReset(ctx) {
      dispatch(ctx.form.getState());
    },
    onSubmitSuccess(_v, ctx) {
      dispatch(ctx.form.getState());
    },
  };
}

// A minimal slice-aware reducer so consumers don't have to write boilerplate.
// Stores a `{ slice: { values, errors?, state? } }` map keyed by the action's
// `slice` field. Consumers can swap this for a Redux Toolkit slice trivially.
export interface FillamentReducerState {
  [slice: string]: MirroredPayload<unknown>;
}

export function fillamentReducer(
  state: FillamentReducerState = {},
  action: { type: string; slice?: string; payload?: MirroredPayload<unknown> }
): FillamentReducerState {
  if (!action.type.startsWith("fillament/") || !action.slice) return state;
  return { ...state, [action.slice]: action.payload ?? {} };
}

// Helper for Redux Toolkit users who want to drop a pre-built slice into their
// configureStore() call. We return both a reducer and the canonical action
// type — RTK consumers can also do `createSlice` themselves; this just spares
// the boilerplate for the common case.
export function createFillamentSlice(slice: string) {
  const actionType = `fillament/${slice}/SET`;
  return {
    name: slice,
    actionType,
    reducer(state: MirroredPayload<unknown> = {}, action: { type: string; payload?: MirroredPayload<unknown> }) {
      if (action.type !== actionType) return state;
      return action.payload ?? {};
    },
    setAction(payload: MirroredPayload<unknown>) {
      return { type: actionType, slice, payload };
    },
  };
}

export type { FormState } from "@fillament/core";
