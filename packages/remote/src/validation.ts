import type { RemoteValidationConfig } from "./types.js";

export interface RemoteValidator {
  /**
   * Validate a single field. Returns an error message string when invalid, or
   * undefined when valid. Calls in flight are aborted when a newer call arrives,
   * preventing stale validation responses from overwriting the latest result.
   */
  validate(field: string, value: unknown, values: unknown): Promise<string | undefined>;
  dispose(): void;
}

/**
 * Build a remote validator. Each call to `validate()` debounces and cancels the
 * prior in-flight request via AbortController. The latest fetch is the only one
 * whose result is observed.
 *
 * The fetcher may return:
 *  - a string: treated as the error message,
 *  - undefined / null: treated as valid,
 *  - a boolean: true means valid, false means invalid (generic message).
 */
export function remoteValidation<TValues = unknown>(
  config: RemoteValidationConfig<TValues>
): RemoteValidator {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let generation = 0;
  // Track the pending validate() call's resolver so we can settle it to
  // `undefined` if the caller fires a newer validate() before this one ran.
  // Otherwise consumers awaiting the prior promise would hang forever.
  let pendingResolve: ((v: string | undefined) => void) | null = null;
  const debounceMs = config.debounceMs ?? 0;

  function settlePending(): void {
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = null;
      r(undefined);
    }
  }

  function abort(): void {
    if (controller) {
      controller.abort();
      controller = null;
    }
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    settlePending();
  }

  function validate(field: string, value: unknown, values: unknown): Promise<string | undefined> {
    abort();
    const myGen = ++generation;
    controller = new AbortController();
    const signal = controller.signal;
    return new Promise((resolve) => {
      pendingResolve = resolve;
      const run = async () => {
        try {
          const result = await config.fetcher({
            field,
            value,
            values: values as TValues,
            signal,
          });
          if (myGen !== generation) {
            resolve(undefined);
            return;
          }
          pendingResolve = null;
          if (typeof result === "string") {
            resolve(result);
            return;
          }
          if (result === false) {
            resolve("Invalid");
            return;
          }
          resolve(undefined);
        } catch (err) {
          if (myGen !== generation) {
            resolve(undefined);
            return;
          }
          pendingResolve = null;
          if ((err as { name?: string }).name === "AbortError") {
            resolve(undefined);
            return;
          }
          const mapped = config.onError?.(err);
          resolve(mapped);
        }
      };
      if (debounceMs <= 0) {
        void run();
      } else {
        timer = setTimeout(() => {
          timer = null;
          void run();
        }, debounceMs);
      }
    });
  }

  return {
    validate,
    dispose: abort,
  };
}
