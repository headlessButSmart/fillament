import type { FormApi } from "@fillament/core";

// Global action registry mirroring the form registry: optional modules
// (e.g. @fillament/test-data) register toolbar buttons that operate on the
// currently selected form, without devtools depending on those modules.

export type DevtoolsAction = {
  // Stable identifier — registering the same id twice replaces the action.
  id: string;
  // Button label shown in the devtools toolbar.
  label: string;
  // Optional hover text describing what the action does.
  title?: string;
  run: (form: FormApi<any>) => void | Promise<void>;
};

const actions = new Map<string, DevtoolsAction>();
type Listener = () => void;
const listeners = new Set<Listener>();

// Cached snapshot — must be stable across reads to satisfy useSyncExternalStore.
let snapshot: DevtoolsAction[] = [];

function rebuildSnapshot(): void {
  snapshot = Array.from(actions.values());
}

export function registerDevtoolsAction(action: DevtoolsAction): () => void {
  actions.set(action.id, action);
  rebuildSnapshot();
  notify();
  return () => {
    // Only remove if this exact action is still registered under the id —
    // a later registration with the same id must not be clobbered.
    if (actions.get(action.id) === action) {
      actions.delete(action.id);
      rebuildSnapshot();
      notify();
    }
  };
}

export function listDevtoolsActions(): DevtoolsAction[] {
  return snapshot;
}

export function subscribeDevtoolsActions(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const l of listeners) l();
}
