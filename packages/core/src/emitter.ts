import type { Listener, Unsubscribe } from "./types.js";

// Per-path subscription bus: notify only listeners interested in a given path
// (or a path under their subscribed prefix). The "*" path means "any change".

export class PathEmitter {
  private listeners = new Map<string, Set<Listener<string>>>();

  on(path: string, listener: Listener<string>): Unsubscribe {
    let set = this.listeners.get(path);
    if (!set) {
      set = new Set();
      this.listeners.set(path, set);
    }
    set.add(listener);
    return () => {
      const s = this.listeners.get(path);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) this.listeners.delete(path);
    };
  }

  // emit a change at a concrete path. Listeners registered for "*" always fire.
  // Listeners registered for a prefix (e.g. "contacts") fire when changedPath is
  // under that prefix.
  emit(changedPath: string): void {
    for (const [subscribedPath, set] of this.listeners) {
      if (subscribedPath === "*" || this.isMatch(subscribedPath, changedPath)) {
        for (const l of set) l(changedPath);
      }
    }
  }

  private isMatch(subscribed: string, changed: string): boolean {
    if (subscribed === changed) return true;
    if (changed === "") return true; // root-level change reaches everyone
    return changed.startsWith(subscribed + ".") || subscribed.startsWith(changed + ".");
  }

  clear(): void {
    this.listeners.clear();
  }
}

export class SimpleEmitter<T> {
  private listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(value: T): void {
    for (const l of this.listeners) l(value);
  }

  clear(): void {
    this.listeners.clear();
  }
}
