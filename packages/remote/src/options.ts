import type {
  RemoteOption,
  RemoteOptionsConfig,
  RemoteResultHandle,
  RemoteResultSnapshot,
} from "./types.js";

function shallowKeyEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

/**
 * Build a handle that fetches a list of options keyed by `key`. The handle is
 * intentionally framework-agnostic: a host (React hook, vanilla, etc.) wires it
 * up via `subscribe` / `getSnapshot`.
 *
 * Guarantees:
 *  - Stale responses do not overwrite newer ones (request generation tracked).
 *  - Pending fetches are aborted when the key changes.
 *  - When `enabled` is false the fetch is skipped (status: idle).
 *  - Cache (when configured) is keyed by the resolved key array.
 */
export function remoteOptions<TValues = unknown, TResult = unknown[]>(
  config: RemoteOptionsConfig<TValues, TResult>
): (initialValues: TValues) => RemoteResultHandle<RemoteOption[]> {
  const cache = new Map<string, CacheEntry<RemoteOption[]>>();

  function resolveKey(values: TValues): unknown[] {
    return typeof config.key === "function" ? config.key({ values }) : config.key;
  }
  function resolveEnabled(values: TValues): boolean {
    if (config.enabled === undefined) return true;
    return typeof config.enabled === "function" ? config.enabled({ values }) : config.enabled;
  }

  return function create(initialValues: TValues): RemoteResultHandle<RemoteOption[]> {
    let currentValues = initialValues;
    let currentKey = resolveKey(currentValues);
    let snapshot: RemoteResultSnapshot<RemoteOption[]> = {
      status: "idle",
      data: undefined,
      error: undefined,
      isStale: false,
    };
    const listeners = new Set<() => void>();
    let generation = 0;
    let controller: AbortController | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function emit(): void {
      for (const l of listeners) l();
    }

    function setSnapshot(next: Partial<RemoteResultSnapshot<RemoteOption[]>>): void {
      snapshot = { ...snapshot, ...next };
      emit();
    }

    function cacheKey(k: unknown[]): string {
      try {
        return JSON.stringify(k);
      } catch {
        return String(k);
      }
    }

    function maybeServeFromCache(k: unknown[]): boolean {
      if (config.staleTimeMs == null) return false;
      const entry = cache.get(cacheKey(k));
      if (!entry) return false;
      const age = Date.now() - entry.fetchedAt;
      const fresh = age < config.staleTimeMs;
      setSnapshot({ status: "success", data: entry.data, error: undefined, isStale: !fresh });
      return fresh;
    }

    async function runFetch(values: TValues, key: unknown[]): Promise<void> {
      if (controller) controller.abort();
      controller = new AbortController();
      const myGen = ++generation;
      setSnapshot({ status: "loading", error: undefined });
      try {
        const raw = await config.fetcher({ values, signal: controller.signal });
        if (myGen !== generation) return; // Newer request superseded us.
        const list = Array.isArray(raw) ? (raw as unknown[]) : [];
        const mapped: RemoteOption[] = config.mapOption
          ? list.map((item) => config.mapOption!(item))
          : list.map((item) => normalizeOption(item));
        cache.set(cacheKey(key), { data: mapped, fetchedAt: Date.now() });
        setSnapshot({ status: "success", data: mapped, error: undefined, isStale: false });
      } catch (err) {
        if (myGen !== generation) return;
        if ((err as { name?: string }).name === "AbortError") return;
        config.onError?.(err);
        setSnapshot({ status: "error", error: err });
      }
    }

    function schedule(values: TValues, key: unknown[]): void {
      const ms = config.debounceMs ?? 0;
      if (ms <= 0) {
        void runFetch(values, key);
        return;
      }
      if (debounceTimer != null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void runFetch(values, key);
      }, ms);
    }

    function tick(values: TValues, opts: { force?: boolean } = {}): void {
      currentValues = values;
      const nextKey = resolveKey(values);
      const keyChanged = !shallowKeyEqual(currentKey, nextKey);
      currentKey = nextKey;
      if (!resolveEnabled(values)) {
        if (controller) controller.abort();
        setSnapshot({ status: "idle", data: undefined, error: undefined, isStale: false });
        return;
      }
      if (!opts.force && !keyChanged && snapshot.status !== "idle") return;
      if (maybeServeFromCache(nextKey) && !opts.force) return;
      schedule(values, nextKey);
    }

    // Kick off the first fetch eagerly so consumers don't need to call update().
    tick(initialValues, { force: true });

    return {
      getSnapshot: () => snapshot,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async refetch(values) {
        tick(values as TValues, { force: true });
      },
      update(values) {
        tick(values as TValues);
      },
      dispose() {
        if (controller) controller.abort();
        if (debounceTimer != null) clearTimeout(debounceTimer);
        listeners.clear();
      },
    };
  };
}

function normalizeOption(item: unknown): RemoteOption {
  if (typeof item === "string") return { label: item, value: item };
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const value = String(o.value ?? o.id ?? o.code ?? "");
    const label = String(o.label ?? o.name ?? o.title ?? value);
    return { label, value, disabled: Boolean(o.disabled) };
  }
  const s = String(item);
  return { label: s, value: s };
}
