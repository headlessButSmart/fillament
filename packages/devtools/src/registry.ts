import type { FormApi } from "@fillament/core";

// A simple global registry so <FillamentDevTools /> can discover forms when no
// explicit `form` prop is passed. Forms register on init (via the hook that
// useForm itself can call), or via registerFormForDevtools(form) by hand.

const forms = new Set<FormApi<any>>();
type Listener = () => void;
const listeners = new Set<Listener>();

// Cached snapshot — must be stable across reads to satisfy useSyncExternalStore.
let snapshot: FormApi<any>[] = [];

function rebuildSnapshot(): void {
  snapshot = Array.from(forms);
}

export function registerFormForDevtools(form: FormApi<any>): () => void {
  forms.add(form);
  rebuildSnapshot();
  notify();
  return () => {
    forms.delete(form);
    rebuildSnapshot();
    notify();
  };
}

export function listForms(): FormApi<any>[] {
  return snapshot;
}

export function subscribeFormRegistry(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const l of listeners) l();
}
