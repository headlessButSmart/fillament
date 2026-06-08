import type { FillamentPlugin, FillamentPluginContext } from "@fillament/core";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedPayload<TValues = unknown> {
  version: number;
  savedAt: string;
  values: Partial<TValues>;
}

export interface PersistContext<TValues = unknown> {
  values: TValues;
  ctx: FillamentPluginContext<TValues>;
}

export interface PersistOptions<TValues = unknown> {
  key: string;
  version?: number;
  debounceMs?: number;
  restoreOnMount?: boolean;
  /** Remove the draft from storage after a successful submit. Defaults to `true`.
   *
   *  Set to `false` when multiple forms share the same `key` — e.g. a checkout
   *  draft that several pages can pick up. Use the handle's `clear()` method to
   *  remove the draft on demand instead. */
  clearOnSubmit?: boolean;
  /** Remove the draft from storage when `form.reset()` is called. Defaults to `true`.
   *
   *  For shared-key flows, pair with `clearOnSubmit: false` so neither submit
   *  nor reset wipes the persisted draft. */
  clearOnReset?: boolean;
  storage?: StorageLike;
  include?: string[];
  exclude?: string[];
  /** Override the default sensitive-field filter. The default excludes fields whose
   *  path segments contain password / token / ssn / creditCard / cvv / otp / mfa etc.
   *  Set to `false` to opt out (NOT recommended). */
  excludeSensitive?: boolean | ((path: string) => boolean);
  /** Save automatically when values change. Defaults to `true`.
   *
   *  Set to `false` to disable auto-save — useful when you want a dedicated
   *  "Save as draft" button. Use the returned plugin's `save()` method to flush
   *  on demand. `clearOnSubmit` and the reset behavior still apply in manual
   *  mode unless you also disable those. */
  autoSave?: boolean;
  serialize?: (payload: PersistedPayload<TValues>) => string;
  deserialize?: (raw: string) => PersistedPayload<TValues>;
  migrate?: (
    values: unknown,
    fromVersion: number,
    toVersion: number
  ) => Partial<TValues>;
  shouldPersist?: (ctx: PersistContext<TValues>) => boolean;
  onRestoreError?: (err: unknown) => void;
  /** Observe successful writes (manual or auto). Useful for "Saved 2 sec ago" UIs. */
  onAfterSave?: (savedAt: Date) => void;
}

export interface PersistPluginHandle<TValues = unknown> extends FillamentPlugin<TValues> {
  /** Flush the current form values to storage now (cancels any pending debounce). */
  save(): void;
  /** Remove the persisted draft from storage. */
  clear(): void;
  /** Re-read the draft from storage and apply it via setValues. */
  restore(): void;
  /** True once the plugin has been wired to a form via onInit. */
  readonly isReady: boolean;
  /** Timestamp of the last successful save (manual or auto), or null. */
  readonly lastSavedAt: Date | null;
}
