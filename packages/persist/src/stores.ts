import type { StorageLike } from "./types.js";

// Memory store used as a fallback when window/localStorage are unavailable
// (SSR, sandboxed iframes, privacy modes, broken quotas, etc.).
export function createMemoryDraftStore(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function tryGlobalStorage(getter: () => Storage | undefined): StorageLike {
  // Resolve lazily — we never want top-level access to throw under SSR.
  return {
    getItem(key) {
      try {
        const s = getter();
        return s ? s.getItem(key) : null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        const s = getter();
        if (s) s.setItem(key, value);
      } catch {
        // Quota exceeded / private mode — silently drop.
      }
    },
    removeItem(key) {
      try {
        const s = getter();
        if (s) s.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export function createLocalStorageStore(): StorageLike {
  return tryGlobalStorage(() =>
    typeof window !== "undefined" ? window.localStorage : undefined
  );
}

export function createSessionStorageStore(): StorageLike {
  return tryGlobalStorage(() =>
    typeof window !== "undefined" ? window.sessionStorage : undefined
  );
}
