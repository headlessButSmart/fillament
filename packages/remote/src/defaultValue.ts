import type {
  RemoteDefaultValueConfig,
  RemoteResultHandle,
  RemoteResultSnapshot,
} from "./types.js";

// Fetch a default value once enabled; resolves to whatever the fetcher returns.
// Used for remote-driven default seeds (e.g. "/api/me/default-shipping-address").
export function remoteDefaultValue<TValues = unknown, TResult = unknown>(
  config: RemoteDefaultValueConfig<TValues, TResult>
): (initialValues: TValues) => RemoteResultHandle<TResult> {
  function resolveEnabled(values: TValues): boolean {
    if (config.enabled === undefined) return true;
    return typeof config.enabled === "function" ? config.enabled({ values }) : config.enabled;
  }
  function resolveKey(values: TValues): unknown[] {
    return typeof config.key === "function" ? config.key({ values }) : config.key;
  }

  return function create(initialValues: TValues): RemoteResultHandle<TResult> {
    let snapshot: RemoteResultSnapshot<TResult> = {
      status: "idle",
      data: undefined,
      error: undefined,
      isStale: false,
    };
    const listeners = new Set<() => void>();
    let generation = 0;
    let controller: AbortController | null = null;
    let lastKey: string | null = null;

    function emit(): void {
      for (const l of listeners) l();
    }
    function setSnapshot(next: Partial<RemoteResultSnapshot<TResult>>): void {
      snapshot = { ...snapshot, ...next };
      emit();
    }
    function k(values: TValues): string {
      try {
        return JSON.stringify(resolveKey(values));
      } catch {
        return String(resolveKey(values));
      }
    }

    async function run(values: TValues): Promise<void> {
      if (controller) controller.abort();
      controller = new AbortController();
      const myGen = ++generation;
      setSnapshot({ status: "loading", error: undefined });
      try {
        const data = await config.fetcher({ values, signal: controller.signal });
        if (myGen !== generation) return;
        setSnapshot({ status: "success", data, error: undefined });
      } catch (err) {
        if (myGen !== generation) return;
        if ((err as { name?: string }).name === "AbortError") return;
        config.onError?.(err);
        setSnapshot({ status: "error", error: err });
      }
    }

    function tick(values: TValues, force = false): void {
      if (!resolveEnabled(values)) {
        if (controller) controller.abort();
        setSnapshot({ status: "idle", data: undefined, error: undefined });
        return;
      }
      const key = k(values);
      if (!force && key === lastKey) return;
      lastKey = key;
      void run(values);
    }

    tick(initialValues, true);

    return {
      getSnapshot: () => snapshot,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async refetch(values) {
        tick(values as TValues, true);
      },
      update(values) {
        tick(values as TValues);
      },
      dispose() {
        if (controller) controller.abort();
        listeners.clear();
      },
    };
  };
}

// Suggestion API alias — semantically the same as remoteOptions but reads more
// naturally for autocomplete-style usage. Re-exported from options.ts when the
// caller wants `{label,value}` shaped results.
export { remoteOptions as remoteSuggestions } from "./options.js";
