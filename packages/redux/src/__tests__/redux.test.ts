import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createForm } from "@fillament/core";
import {
  createFillamentSlice,
  createReduxBridge,
  fillamentReducer,
  type StoreLike,
} from "../index.js";

function makeStore(initial: any = {}): StoreLike & { actions: Array<any>; setState: (s: any) => void } {
  let state = initial;
  const listeners = new Set<() => void>();
  const actions: any[] = [];
  return {
    actions,
    getState: () => state,
    dispatch: (action) => {
      actions.push(action);
      state = fillamentReducer(state, action as any);
      for (const l of listeners) l();
      return action;
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    setState: (s) => {
      state = s;
      for (const l of listeners) l();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("@fillament/redux", () => {
  it("mirrors values into the store on change", () => {
    const store = makeStore();
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [createReduxBridge({ store, slice: "user" })],
    });
    form.setValue("name", "Ana");
    expect(store.actions.length).toBeGreaterThanOrEqual(2); // init + change
    const last = store.actions[store.actions.length - 1]!;
    expect(last.slice).toBe("user");
    expect(last.payload.values.name).toBe("Ana");
  });

  it("hydrates initial form values from the store", () => {
    const store = makeStore({ user: { values: { name: "Hydrated" } } });
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [createReduxBridge({ store, slice: "user", hydrate: true })],
    });
    expect(form.getValue("name")).toBe("Hydrated");
  });

  it("debounces dispatches when debounceMs is set", () => {
    const store = makeStore();
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [createReduxBridge({ store, slice: "user", debounceMs: 100 })],
    });
    const initial = store.actions.length;
    form.setValue("name", "A");
    form.setValue("name", "AB");
    form.setValue("name", "ABC");
    expect(store.actions.length).toBe(initial);
    vi.advanceTimersByTime(150);
    expect(store.actions.length).toBe(initial + 1);
    expect(store.actions[store.actions.length - 1]!.payload.values.name).toBe("ABC");
  });

  it("does not cause an infinite loop when the store dispatches back", () => {
    const store = makeStore();
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [createReduxBridge({ store, slice: "user" })],
    });
    const before = store.actions.length;
    // Simulate an external store update — the bridge does not subscribe to it,
    // so this must not produce additional fillament dispatches.
    store.setState({ user: { values: { name: "external" } } });
    expect(store.actions.length).toBe(before);
  });

  it("respects mode = values-and-errors", () => {
    const store = makeStore();
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [createReduxBridge({ store, slice: "user", mode: "values-and-errors" })],
    });
    form.setValue("name", "X");
    const last = store.actions[store.actions.length - 1]!;
    expect(last.payload.values).toBeDefined();
    expect(last.payload.errors).toBeDefined();
    expect(last.payload.state).toBeUndefined();
  });

  it("respects mode = full-state", () => {
    const store = makeStore();
    const form = createForm<{ name: string }>({
      defaultValues: { name: "" },
      plugins: [createReduxBridge({ store, slice: "user", mode: "full-state" })],
    });
    form.setValue("name", "X");
    const last = store.actions[store.actions.length - 1]!;
    expect(last.payload.state).toBeDefined();
  });

  it("fillamentReducer ignores foreign actions", () => {
    const state = { existing: { values: { x: 1 } } };
    const next = fillamentReducer(state as any, { type: "unrelated/action" });
    expect(next).toBe(state);
  });

  it("createFillamentSlice exposes reducer + actionType helpers", () => {
    const slice = createFillamentSlice("checkout");
    expect(slice.actionType).toBe("fillament/checkout/SET");
    const action = slice.setAction({ values: { foo: "bar" } });
    expect(slice.reducer({}, action)).toEqual({ values: { foo: "bar" } });
  });
});
