import type { FillamentPluginContext } from "@fillament/core";
import type { PersistOptions, PersistedPayload, PersistPluginHandle, StorageLike } from "./types.js";
import { DEFAULT_SENSITIVE_PATTERNS, isSensitivePath } from "./sensitive.js";
import { getAt, leafPaths, matchesAny, setAt } from "./path.js";
import { createLocalStorageStore } from "./stores.js";

const DEFAULT_DEBOUNCE_MS = 400;
const DEFAULT_VERSION = 1;

function defaultSerialize<T>(payload: PersistedPayload<T>): string {
  return JSON.stringify(payload);
}

function defaultDeserialize<T>(raw: string): PersistedPayload<T> {
  return JSON.parse(raw) as PersistedPayload<T>;
}

function filterValues<TValues>(
  values: TValues,
  options: PersistOptions<TValues>
): Partial<TValues> {
  if (values == null || typeof values !== "object") return values as Partial<TValues>;
  const paths = leafPaths(values);
  const include = options.include ?? [];
  const exclude = options.exclude ?? [];
  const sensitivePredicate =
    options.excludeSensitive === false
      ? () => false
      : typeof options.excludeSensitive === "function"
        ? options.excludeSensitive
        : (path: string) => isSensitivePath(path, DEFAULT_SENSITIVE_PATTERNS);

  // Start empty and accumulate only the paths we want to persist.
  let out: Record<string, unknown> = Array.isArray(values) ? ({} as any) : {};
  for (const p of paths) {
    if (include.length > 0 && !matchesAny(p, include)) continue;
    if (exclude.length > 0 && matchesAny(p, exclude)) continue;
    if (sensitivePredicate(p)) continue;
    out = setAt(out, p, getAt(values, p));
  }
  return out as Partial<TValues>;
}

/**
 * Create a Fillament plugin that auto-saves drafts to the provided storage and
 * restores them on mount. By default it uses localStorage, the project's
 * default sensitive-field exclusions, and saves automatically on every change.
 *
 * Set `autoSave: false` to switch to manual mode — the plugin still restores
 * on mount and clears on submit, but no save fires on value change. Drive
 * saves with the returned `.save()` method (e.g. from a "Save as draft" button).
 *
 * Failures (quota, parse, missing window) are swallowed — persistence must
 * never break the form. See `onRestoreError` to observe restore failures.
 */
export function createStoragePersistPlugin<TValues = unknown>(
  options: PersistOptions<TValues>
): PersistPluginHandle<TValues> {
  const storage: StorageLike = options.storage ?? createLocalStorageStore();
  const version = options.version ?? DEFAULT_VERSION;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const restoreOnMount = options.restoreOnMount ?? true;
  const clearOnSubmit = options.clearOnSubmit ?? true;
  const clearOnReset = options.clearOnReset ?? true;
  const autoSave = options.autoSave ?? true;
  const serialize = options.serialize ?? defaultSerialize;
  const deserialize = options.deserialize ?? defaultDeserialize;

  let timer: ReturnType<typeof setTimeout> | null = null;
  // Captured during onInit so `save()` / `clear()` / `restore()` can be called
  // externally (e.g. from a button click) without a plugin context.
  let ctxRef: FillamentPluginContext<TValues> | null = null;
  let lastSavedAt: Date | null = null;

  function writeNow(ctx: FillamentPluginContext<TValues>): boolean {
    try {
      const values = ctx.form.getValues();
      if (options.shouldPersist && !options.shouldPersist({ values, ctx })) return false;
      const filtered = filterValues(values, options);
      const savedAt = new Date();
      const payload: PersistedPayload<TValues> = {
        version,
        savedAt: savedAt.toISOString(),
        values: filtered,
      };
      storage.setItem(options.key, serialize(payload));
      lastSavedAt = savedAt;
      options.onAfterSave?.(savedAt);
      return true;
    } catch {
      // Persistence failures must never break the form.
      return false;
    }
  }

  function scheduleSave(ctx: FillamentPluginContext<TValues>): void {
    if (debounceMs <= 0) {
      writeNow(ctx);
      return;
    }
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      writeNow(ctx);
    }, debounceMs);
  }

  function restoreInto(ctx: FillamentPluginContext<TValues>): void {
    try {
      const raw = storage.getItem(options.key);
      if (raw == null) return;
      let parsed: PersistedPayload<TValues> | null = null;
      try {
        parsed = deserialize(raw);
      } catch {
        storage.removeItem(options.key);
        return;
      }
      if (!parsed || typeof parsed !== "object") return;
      const savedVersion = typeof parsed.version === "number" ? parsed.version : 0;
      let values: Partial<TValues> = parsed.values ?? {};
      if (savedVersion !== version) {
        if (options.migrate) {
          try {
            values = options.migrate(values, savedVersion, version) ?? values;
          } catch (err) {
            options.onRestoreError?.(err);
            values = {};
          }
        } else {
          // No migration path — drop the old draft rather than restoring a
          // payload that may not match the new schema.
          storage.removeItem(options.key);
          values = {};
        }
      }
      if (values && Object.keys(values).length > 0) {
        ctx.form.setValues(values);
      }
    } catch (err) {
      options.onRestoreError?.(err);
    }
  }

  const handle: PersistPluginHandle<TValues> = {
    name: "@fillament/persist",
    onInit(ctx) {
      ctxRef = ctx;
      if (restoreOnMount) restoreInto(ctx);
      return () => {
        if (timer != null) {
          clearTimeout(timer);
          timer = null;
        }
        ctxRef = null;
      };
    },
    onValuesChange(_values, ctx) {
      if (!autoSave) return;
      scheduleSave(ctx);
    },
    onSubmitSuccess() {
      if (!clearOnSubmit) return;
      try {
        storage.removeItem(options.key);
        lastSavedAt = null;
      } catch {
        // ignore
      }
    },
    onReset() {
      if (!clearOnReset) return;
      try {
        storage.removeItem(options.key);
        lastSavedAt = null;
      } catch {
        // ignore
      }
    },
    save() {
      if (!ctxRef) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn("[fillament/persist] save() called before the plugin attached to a form");
        }
        return;
      }
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      writeNow(ctxRef);
    },
    clear() {
      try {
        storage.removeItem(options.key);
        lastSavedAt = null;
      } catch {
        // ignore
      }
    },
    restore() {
      if (!ctxRef) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn("[fillament/persist] restore() called before the plugin attached to a form");
        }
        return;
      }
      restoreInto(ctxRef);
    },
    get isReady() {
      return ctxRef !== null;
    },
    get lastSavedAt() {
      return lastSavedAt;
    },
  };
  return handle;
}
