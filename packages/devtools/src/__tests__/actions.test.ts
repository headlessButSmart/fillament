import { describe, it, expect } from "vitest";
import {
  registerDevtoolsAction,
  listDevtoolsActions,
  subscribeDevtoolsActions,
} from "../actions.js";

describe("devtools action registry", () => {
  it("registers, lists, and unregisters actions", () => {
    const action = { id: "test", label: "Test", run: () => {} };
    const unregister = registerDevtoolsAction(action);
    expect(listDevtoolsActions()).toContain(action);
    unregister();
    expect(listDevtoolsActions()).not.toContain(action);
  });

  it("replaces actions registered under the same id", () => {
    const a = { id: "dup", label: "A", run: () => {} };
    const b = { id: "dup", label: "B", run: () => {} };
    const unregisterA = registerDevtoolsAction(a);
    registerDevtoolsAction(b);
    expect(listDevtoolsActions().filter((x) => x.id === "dup")).toEqual([b]);
    // Unregistering the stale handle must not remove the replacement.
    unregisterA();
    expect(listDevtoolsActions().filter((x) => x.id === "dup")).toEqual([b]);
    registerDevtoolsAction(b)(); // cleanup
  });

  it("notifies subscribers on changes", () => {
    let calls = 0;
    const unsubscribe = subscribeDevtoolsActions(() => {
      calls += 1;
    });
    const unregister = registerDevtoolsAction({ id: "notify", label: "N", run: () => {} });
    expect(calls).toBe(1);
    unregister();
    expect(calls).toBe(2);
    unsubscribe();
  });

  it("keeps the snapshot stable between mutations", () => {
    const first = listDevtoolsActions();
    expect(listDevtoolsActions()).toBe(first);
  });
});
